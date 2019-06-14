const { ObjectId } = require('mongodb');

const { getDBReference } = require('../lib/mongo');
const { extractValidFields } = require('../lib/validation');

const CourseSchema = {
  subject: { required: true },
  number: { required: true },
  title: { required: true },
  term: { required: true },
  instructorId: { required: true },
};
exports.CourseSchema = CourseSchema;

async function getCoursesPage(page) {
  const db = getDBReference();
  const collection = db.collection('courses');
  const count = await collection.countDocuments();

  const pageSize = 10;
  const lastPage = Math.ceil(count / pageSize);
  page = page > lastPage ? lastPage : page;
  page = page < 1 ? 1 : page;
  const offset = (page - 1) * pageSize;

  const results = await collection.find({})
    .sort({ _id: 1 })
    .skip(offset)
    .limit(pageSize)
    .toArray();

  return {
    courses: results,
    page: page,
    totalPages: lastPage,
    pageSize: pageSize,
    count: count
  };
}
exports.getCoursesPage = getCoursesPage;

async function insertNewCourse(course) {
  course = extractValidFields(course, CourseSchema);
  const db = getDBReference();
  const collection = db.collection('courses');
  const result = await collection.insertOne(course);
  return result.insertedId;
}
exports.insertNewCourse = insertNewCourse;

async function getCourseById(id) {
  const db = getDBReference();
  const collection = db.collection('courses');
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await collection
      .find({ _id: new ObjectId(id) })
      .toArray();
	delete results[0].students;
    return results[0];
  }
}

exports.getCourseById = getCourseById

async function getCoursesByStudent(id) {
  const db = getDBReference();
  const collection = db.collection('courses');
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await collection
      .find({ students: id })
      .toArray();
    return results;
  }
}

exports.getCoursesByStudent = getCoursesByStudent;

async function getStudentsById(id) {
  const db = getDBReference();
  const collection = db.collection('courses');
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await collection
      .find({ _id: new ObjectId(id) })
      .toArray();
    console.log(results[0]);
	return results[0].students;
  }
}

exports.getStudentsById = getStudentsById;

async function getAssignmentsById(id) {
  const db = getDBReference();
  const collection = db.collection('courses');
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await collection
      .find({ _id: new ObjectId(id) })
      .toArray();
    console.log(results[0]);
    return results[0].students;
  }
}

exports.getStudentsById = getStudentsById;

async function validateStudentCourse(userId, courseId){
	const students = await getStudentsById(courseId);

	if (students.indexOf(userId) == -1)
		return false;
	else
		return true;
}

exports.validateStudentCourse = validateStudentCourse;

async function addStudentsById(id, students) {
  const db = getDBReference();
  const collection = db.collection('courses');
  if (!ObjectId.isValid(id)) {
    return false;
  } else {
	await removeStudentsById(id, students);
    const results = await collection
      .update({ _id: new ObjectId(id) }, { $push: { students: { $each: students } } })
    return true;
  }
}

exports.addStudentsById = addStudentsById;

async function removeStudentsById(id, students) {
  const db = getDBReference();
  const collection = db.collection('courses');
  if (!ObjectId.isValid(id)) {
    return false;
  } else {
    const results = await collection
      .update({ _id: new ObjectId(id) }, { $pull: { students: { $in: students } } })
    return true;
  }
}

exports.removeStudentsById = removeStudentsById;

async function patchCourseById(id, data) {
	data = extractValidFields(data, CourseSchema);
	const db = getDBReference();
	const collection = db.collection('courses');
	if(!ObjectId.isValid(id)){
		return false;
	} else {
		const results = await collection.update({_id: id }, { $set: data });
		return true;
	}
}

exports.patchCourseById = patchCourseById;

async function deleteCourseById(id) {
	const db = getDBReference();
	const collection = db.collection('courses');
	if(!ObjectId.isValid(id)){
		return false;
	} else {
		const results = await collection.deleteOne({_id: id });
		return true;
	}
}

exports.deleteCourseById = deleteCourseById;

