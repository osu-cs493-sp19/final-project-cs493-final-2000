const router = require('express').Router();

const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');

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
  removeStudentsById,
  validateStudentCourse
} = require('../models/course');

const {
	AssignmentSchema,
	insertNewAssignment,
	getAssignmentById,
	patchAssignmentById,
	deleteAssignmentById,
	getSubmissionsById,
	getSubmissionsPage,
	SubmissionSchema,
	saveSubmission
} = require('../models/assignment');

const { getUserDetailsById } = require('../models/user');

const { requireAuthentication } = require('../lib/auth');

const fileTypes = {
  'file/txt': 'txt',
  'text/plain': 'txt'
};

const upload = multer({
  storage: multer.diskStorage({
    destination: `${__dirname}/uploads`,
    filename: (req, file, callback) => {
      const basename = crypto.pseudoRandomBytes(16).toString('hex');
      const extension = 'txt';
      callback(null, `${basename}.${extension}`);
    }
  }),
  fileFilter: (req, file, callback) => {
    callback(null, !!fileTypes[file.mimetype])
  }
});

router.post('/', requireAuthentication, async (req, res) => {
    if (validateAgainstSchema(req.body, AssignmentSchema)){
	let user = await getUserDetailsById(req.user);
    if (user == undefined) user = {role:"student"};
    if (user.role == 'student'){
        res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
    } else {
    try {

      const course = await getCourseById(req.body.courseId);
        if (course){
            if (user.role == 'instructor'){
                if (req.user == course.instructorId){
					const id = await insertNewAssignment(req.body);
                    res.status(200).send({id:id});
                }else {
                    res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
                }
            }
            else {
                const id = await insertNewAssignment(req.body);
                res.status(200).send({id:id});

            }
        } else {
            res.status(404).send({error: "Specified Assignment `id` not found."});
        }
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: "Error inserting assignment into DB.  Please try again later."
      });
    }
    }
	} else {
		res.status(400).send({error:"The request body was either not present or did not contain a valid Assignment object."});
	}
});

router.get('/:id', requireAuthentication, async (req, res) => {
    try {

      const assignment = await getAssignmentById(req.params.id);
        if (assignment){
        	res.status(200).send(assignment);
        } else {
            res.status(404).send({error: "Specified Assignment `id` not found."});
        }
    } catch (err) {
      console.error(err);
      res.status(404).send({
        error: "Specified Assignment `id` not found."
      });
    }
});

router.patch('/:id', requireAuthentication, async (req, res) => {
    let user = await getUserDetailsById(req.user);
    if (user == undefined) user = {role:"student"};
    if (user.role == 'student'){
        res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
    } else {
    try {
      const assignment = await getAssignmentById(req.params.id);
      const course = await getCourseById(assignment.courseId);
        if (course){
            if (user.role == 'instructor'){
                if (req.user == course.instructorId){
                    const pass = await patchAssignmentById(assignment._id, req.body);
                    console.log(pass);
					res.status(200).send();
                }else {
                    res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
                }
            }
            else {
                await patchAssignmentById(assignment._id, req.body);
                res.status(200).send();
            
            }
        } else {
            res.status(404).send({error: "Specified Assignment `id` not found."});
        }
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: "Error inserting assignment into DB.  Please try again later."
      });
    }
    }
});

router.delete('/:id', requireAuthentication, async (req, res) => {
    let user = await getUserDetailsById(req.user);
    if (user == undefined) user = {role:"student"};
    if (user.role == 'student'){
        res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
    } else {
    try {
      const assignment = await getAssignmentById(req.params.id);
      const course = await getCourseById(assignment.courseId);
        if (course){
            if (user.role == 'instructor'){
                if (req.user == course.instructorId){
                    const pass = await deleteAssignmentById(assignment._id, req.body);
                    res.status(204).send();
                }else {
                    res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
                }
            }
            else {
                await deleteAssignmentById(assignment._id, req.body);
                res.status(200).send();

            }
        } else {
            res.status(404).send({error: "Specified Assignment `id` not found."});
        }
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: "Error inserting assignment into DB.  Please try again later."
      });
    }
    }
});

router.get('/:id/submissions', requireAuthentication, async (req, res) => {
    let user = await getUserDetailsById(req.user);
    if (user == undefined) user = {role:"student"};
    if (user.role == 'student'){
        res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
    } else {
    try {
      const assignment = await getAssignmentById(req.params.id);
      const course = await getCourseById(assignment.courseId);
        if (course){
            if (user.role == 'instructor'){
                if (req.user == course.instructorId){
                    const submissionPage = await getSubmissionsPage(assignment._id, parseInt(req.query.page) || 1);
    				submissionPage.links = {};
    				if (submissionPage.page < submissionPage.totalPages) {
      					submissionPage.links.nextPage = `/assignments/${assignment._id}/submissions?page=${submissionPage.page + 1}`;
      					submissionPage.links.lastPage = `/assignments/${assignment._id}/submissions?page=${submissionPage.totalPages}`;
    				}
    				if (submissionPage.page > 1) {
      					submissionPage.links.prevPage = `/assignments/${assignment._id}/submissions?page=${submissionPage.page - 1}`;
      					submissionPage.links.firstPage = `/assignments/${assignment._id}/submissions?page=1`;
    				}
    				res.status(200).send(submissionPage);
                }else {
                    res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria."});
                }
            }
            else {
                let submissions =  await getSubmissionsById(assignment._id);
                if (submissions == undefined) submissions = "No submissions";
                res.status(200).send({submissions: submissions});
            
            }
        } else {
            res.status(404).send({error: "Specified Assignment `id` not found."});
        }
    } catch (err) {
      console.error(err);
      res.status(404).send({
        error: "Specified Assignment `id` not found."
      });
    }
    }
});



function removeUploadedFile(file) {
  return new Promise((resolve, reject) => {
    fs.unlink(file.path, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

}

router.post('/:id/submissions', upload.single('file'), requireAuthentication, async (req, res, next) => {
  if (req.file) {
    let user = await getUserDetailsById(req.user);
	if (user && user.role == "student"){
    try {
	  const assignment = await getAssignmentById(req.params.id);
	  if (assignment == undefined) res.status(404).send({error:"Assignment not found."});
      const userIn = validateStudentCourse(user._id, assignment.courseId);
	  if (!userIn) res.status(403).send({error:"Student not enrolled in course."});
	  
	  const file = {
        path: req.file.path,
        filename: req.file.filename,
        contentType: req.file.mimetype,
        userId: req.body.userId
      };
      const id = await saveSubmission(assignment._id,file,req.body, user._id);
      await removeUploadedFile(req.file);
      res.status(201).send({ id: id });
    } catch (err) {
      console.log(err);
	  res.status(404).send({error:"Assignment with students not found."});
    }
	} else {
		res.status(403).send({error: "Only students can submit files"});
	}	  
  } else {
    res.status(400).send({
      err: "Request body was invalid."
    });
  }
});

module.exports = router;
