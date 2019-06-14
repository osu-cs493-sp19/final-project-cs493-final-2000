const fs = require('fs');

const { ObjectId, GridFSBucket } = require('mongodb');

const { getDBReference } = require('../lib/mongo');
const { extractValidFields } = require('../lib/validation');

const AssignmentSchema = { 
  courseId: { required: true },
  title: { required: true },
  points: { required: true },
  due: { required: true }, 
};

const SubmissionSchema = {
  studentId: {required: false }
};

exports.AssignmentSchema = AssignmentSchema;

async function insertNewAssignment(assignment) {
  assignment = extractValidFields(assignment, AssignmentSchema);
  const db = getDBReference();
  const collection = db.collection('assignments');
  const result = await collection.insertOne(assignment);
  return result.insertedId;
}
exports.insertNewAssignment = insertNewAssignment;

async function getAssignmentById(id) {
  const db = getDBReference();
  const collection = db.collection('assignments');
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await collection
      .find({ _id: new ObjectId(id) })
      .toArray();
	delete results[0].submissions;
    return results[0];
  }
}

exports.getAssignmentById = getAssignmentById;

async function getAssignmentsByCourse(id) {
  const db = getDBReference();
  const collection = db.collection('assignments');
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await collection
      .find({ courseId: id })
      .toArray();
    return results;
  }
}

exports.getAssignmentsByCourse = getAssignmentsByCourse;

function saveSubmission (assignmentId, file, body, userId) {
  return new Promise((resolve, reject) => {
	body = extractValidFields(body, SubmissionSchema);
    const db = getDBReference();
    const bucket = new GridFSBucket(db, { bucketName: 'files' });

    const metadata = {
      contentType: file.contentType
    };

    const uploadStream = bucket.openUploadStream(
      file.filename,
      { metadata: metadata }
    );

    fs.createReadStream(file.path)
      .pipe(uploadStream)
      .on('error', (err) => {
        reject(err);
      })
      .on('finish', async (result) => {
		const collection = db.collection('assignments');
		body.file = '/media/documents/' + file.filename;
		body.id = result._id;
		body.assignmentId = assignmentId;
		body.timestamp = new Date();
		body.studentId = userId;
		await collection.updateOne({_id:assignmentId}, { $push: { submissions: body }});
        resolve(result._id);
      });
  });
};

exports.saveSubmission = saveSubmission;

async function patchAssignmentById(id, data) {
    data = extractValidFields(data, AssignmentSchema);
	console.log(data);
    const db = getDBReference();
    const collection = db.collection('assignments');
    if(!ObjectId.isValid(id)){
        return false;
    } else {
        const results = await collection.update({_id: id }, { $set: data });
        return true;
    }
}

exports.patchAssignmentById = patchAssignmentById;

async function deleteAssignmentById(id) {
    const db = getDBReference();
    const collection = db.collection('assignments');
    if(!ObjectId.isValid(id)){
        return false;
    } else {
        const results = await collection.deleteOne({_id: id });
        return true;
    }
}

exports.deleteAssignmentById = deleteAssignmentById;

async function getSubmissionsById(id) {
  const db = getDBReference();
  const collection = db.collection('assignments');
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await collection
      .find({ _id: new ObjectId(id) })
      .toArray();
    console.log(results[0]);
    return results[0].submissions;
  }
}

exports.getSubmissionsById = getSubmissionsById;

async function getSubmissionsPage(id, page) {
  const db = getDBReference();
  const collection = db.collection('assignments');

  const results = await collection.find({ _id: new ObjectId(id) })
    .toArray();

  let submissions = results[0].submissions;
  let count;
  if (submissions)
  	count = submissions.length;
  else{
	count = 0
	submissions = [];	
  }

  const pageSize = 10;
  const lastPage = Math.ceil(count / pageSize);
  page = page > lastPage ? lastPage : page;
  page = page < 1 ? 1 : page;
  const offset = (page - 1) * pageSize;


  submissions = submissions.slice(offset, offset+pageSize);

  return {
    submissions: submissions,
    page: page,
    totalPages: lastPage,
    pageSize: pageSize,
    count: count
  };
}
exports.getSubmissionsPage = getSubmissionsPage;
