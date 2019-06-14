const { ObjectId } = require('mongodb');
const { bcrypt } = require('bcryptjs');
const { getDBReference } = require('../lib/mongo');
const { extractValidFields } = require('../lib/validation');

const UserSchema = {
  name: { required: true },
  email: { required: true },
  password: { required: true },
  role: { required: true },
};
exports.UserSchema = UserSchema;

async function getBusinessesPage(page) {
  const db = getDBReference();
  const collection = db.collection('businesses');
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
    businesses: results,
    page: page,
    totalPages: lastPage,
    pageSize: pageSize,
    count: count
  };
}
exports.getBusinessesPage = getBusinessesPage;

async function insertNewUser(user) {
  business = extractValidFields(user, UserSchema);
  const db = getDBReference();
  const collection = db.collection('users');
  const result = await collection.insertOne(user);
  return result.insertedId;
}
exports.insertNewUser = insertNewUser;

async function getUserByEmail(email, showP=false) {
	const db = getDBReference();
	const collection = db.collection('users');
	console.log(email);
	const results = await collection
      .find({ email: email })
      .toArray();
    return results[0];
}
exports.getUserByEmail = getUserByEmail;

async function validateUser(email, password){
    const user = await getUserByEmail(email, true);
    console.log(user)
	if (user){
		console.log(user.password)
        return password == user.password;
    }
    else{
        return false;
    }
}
exports.validateUser = validateUser;

async function getUserDetailsById(id) {
  const db = getDBReference();
  const collection = db.collection('users');
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await collection
      .find({ _id: new ObjectId(id) })
      .toArray();
    return results[0];
  }
}

exports.getUserDetailsById = getUserDetailsById;


