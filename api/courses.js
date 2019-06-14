const router = require('express').Router();

const { validateAgainstSchema } = require('../lib/validation');
const {
  CourseSchema,
  getCoursesPage,
  insertNewCourse,
  getCourseById,
  patchCourseById,
  deleteCourseById,
  getStudentsById,
  addStudentsById,
  removeStudentsById
} = require('../models/course');

const { getAssignmentsByCourse } = require('../models/assignment');

const { getUserDetailsById } = require('../models/user');

const { requireAuthentication } = require('../lib/auth');

router.get('/', async (req, res) => {
  try {
    const coursePage = await getCoursesPage(parseInt(req.query.page) || 1);
    coursePage.links = {};
    if (coursePage.page < coursePage.totalPages) {
      coursePage.links.nextPage = `/courses?page=${coursePage.page + 1}`;
      coursePage.links.lastPage = `/courses?page=${coursePage.totalPages}`;
    }
    if (coursePage.page > 1) {
      coursePage.links.prevPage = `/courses?page=${coursePage.page - 1}`;
      coursePage.links.firstPage = '/courses?page=1';
    }
    res.status(200).send(coursePage);
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Error fetching businesses list.  Please try again later."
    });
  }
});

router.post('/', requireAuthentication, async (req, res) => {
  if (validateAgainstSchema(req.body, CourseSchema)) {
    let user = await getUserDetailsById(req.user);
    if (user == undefined) user = {role:"student"};
    if (user.role != 'admin'){
        res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
    } else {
    try {
      const id = await insertNewCourse(req.body);
      res.status(201).send({
        id: id
      });
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: "Error inserting course into DB.  Please try again later."
      });
    }
    }
  } else {
	res.status(400).send({error: "The request body was either not present or did not contain a valid Course object."});
  }
});

router.get('/:id', async (req, res, next) => {
    try {
        const course = await getCourseById(req.params.id);
        if (course){
           res.status(200).send(course);
        } else {
            res.status(404).send({error: "Specified Course `id` not found."});
        }
    
    } catch (err){
        console.log(err);
        res.status(404).send({error:"Specified Course `id` not found."});
    }
});

router.patch('/:id', requireAuthentication, async (req, res) => {
    let user = await getUserDetailsById(req.user);
    if (user == undefined) user = {role:"student"};
    if (user.role == 'student'){
        res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
    } else {
    try {

	  const course = await getCourseById(req.params.id);
        if (course){
			if (user.role == 'instructor'){
				if (req.user == course.instructorId){
					await patchCourseById(course._id, req.body);
					res.status(200).send();
				}else {
        			res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
				}
			}
			else {
				await patchCourseById(course._id, req.body);
				res.status(200).send();
			}
        } else {
            res.status(404).send({error: "Specified Course `id` not found."});
        }
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: "Error inserting course into DB.  Please try again later."
      });
    }
    }
});

router.delete('/:id', requireAuthentication, async (req, res) => {
    let user = await getUserDetailsById(req.user);
    if (user == undefined) user = {role:"student"};
    if (user.role != 'admin'){
        res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
    } else {
    try {
	  const course = await getCourseById(req.params.id);
      
	  if(course){
	  	const id = await deleteCourseById(course._id);
      	res.status(204).send();
	  } else {
		res.status(404).send('No course found at this id');
	  }
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: "Error removing course from DB.  Please try again later."
      });
    }
    }
});

router.get('/:id/students', requireAuthentication, async (req, res) => {
    let user = await getUserDetailsById(req.user);
    if (user == undefined) user = {role:"student"};
    if (user.role == 'student'){
        res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
    } else {
    try {

	  const course = await getCourseById(req.params.id);
        if (course){
			if (user.role == 'instructor'){
				if (req.user == course.instructorId){
					let students =  await getStudentsById(course._id);
					if (students == undefined) students = "No students"; 
					res.status(200).send({students: students});
				}else {
        			res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
				}
			}
			else {
				let students =  await getStudentsById(course._id);
				if (students == undefined) students = "No students"; 
				res.status(200).send({students: students});

			}
        } else {
            res.status(404).send({error: "Specified Course `id` not found."});
        }
    } catch (err) {
      console.error(err);
      res.status(404).send({
        error: "Specified Course `id` not found."
      });
    }
    }
});

router.post('/:id/students', requireAuthentication, async (req, res) => {
    let user = await getUserDetailsById(req.user);
    if (user == undefined) user = {role:"student"};
    if (typeof req.body.add == 'undefined' || typeof req.body.remove == 'undefined')
		res.status(400).send({error:"The request body was either not present or did not contain the fields"});
	else if (user.role == 'student'){
        res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
    } else {
    try {

	  const course = await getCourseById(req.params.id);
        if (course){
			if (user.role == 'instructor'){
				if (req.user == course.instructorId){
					await addStudentsById(course._id, req.body.add);
					await removeStudentsById(course._id, req.body.remove);
					res.status(200).send();
				}else {
        			res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
				}
			}
			else {
				await addStudentsById(course._id, req.body.add);
				await removeStudentsById(course._id, req.body.remove);
				res.status(200).send();

			}
        } else {
            res.status(404).send({error: "Specified Course `id` not found."});
        }
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: "Error inserting course into DB.  Please try again later."
      });
    }
    }
});

router.get('/:id/assignments', requireAuthentication, async (req, res) => {
	try {
		const assignments = await getAssignmentsByCourse(req.params.id);
		res.status(200).send(assignments);
	}catch (err){
		console.log(err);
		res.status(404).send({error:"Course not found."});
	}
});

router.get('/:id/roster', requireAuthentication, async (req, res) => {
    let user = await getUserDetailsById(req.user);
    if (user == undefined) user = {role:"student"};
    if (user.role == 'student'){
        res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
    } else {
    try {

	  const course = await getCourseById(req.params.id);
        if (course){
			if (user.role == 'instructor'){
				if (req.user == course.instructorId){
					let students =  await getStudentsById(course._id);
					
					res.setHeader('content-type', 'text/csv');

					let csv = "ID	Name	Email\n";

					console.log(students);	

					await students.forEach(async (item) => {
						let student = await getUserDetailsById(item);
						let str = student._id + ',' + student.name + ',' + student.email + '\n';
						csv = csv + str;
					});	
	
					res.status(200).send(csv);
				}else {
        			res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
				}
			}
			else {
				let students =  await getStudentsById(course._id);
					
				res.setHeader('content-type', 'text/csv');

				let csv = "ID	Name	Email\n";

				for (let i = 0; i<students.length; i++){
					let item = students[i];
					let student = await getUserDetailsById(item);
					let str = student._id + ',' + student.name + ',' + student.email + '\n';
					csv = csv + str;
				}	

				res.status(200).send(csv);
			}
        } else {
            res.status(404).send({error: "Specified Course `id` not found."});
        }
    } catch (err) {
      console.error(err);
      res.status(404).send({
        error: "Specified Course `id` not found."
      });
    }
    }
});



module.exports = router;
