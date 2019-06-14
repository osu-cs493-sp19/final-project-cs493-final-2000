const router = require('express').Router();

const { validateAgainstSchema } = require('../lib/validation');

const {
	UserSchema, 
	insertNewUser,
	getUserDetailsById,
	validateUser,
	getUserByEmail,
} = require('../models/user');

const { requireAuthentication, generateAuthToken } = require('../lib/auth');

const { getCoursesByStudent } = require('../models/course');

router.post('/', requireAuthentication, async (req, res) => {
  if (validateAgainstSchema(req.body, UserSchema)) {
	let user = await getUserDetailsById(req.user);
	if (user == undefined) user = {role:"student"};
    if (user.role != 'admin' && req.body.role != 'student'){
		res.status(403).send({error: "Only admins can create a user with that role. Are you logged in?"});	
	} else {
	try {
      const id = await insertNewUser(req.body);
      res.status(201).send({
        id: id
      });
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: "Error inserting user into DB.  Please try again later."
      });
    }
	}
  } else {
	console.log(req.body);
    res.status(400).send({
      error: "The request body was either not present or did not contain a valid User object."
    });
  }
});

router.post('/login', requireAuthentication, async (req, res) => {
	if (req.body.password && req.body.email){
        try {
            if (await validateUser(req.body.email, req.body.password)){
                const user = await getUserByEmail(req.body.email, true);
                const token = generateAuthToken(user._id);
                res.status(200).send({token: token});
            }
            else {
                res.status(401).send({error: "The specified credentials were invalid."});
            }
        }
        catch (err) {
            console.log(err);
            res.status(500).send({error: "An internal server error occurred."});
        }
    }else {
        res.status(400).send({error: "The request body was either not present or did not contain all of the required fields."});
    }	
});

router.get('/:id', requireAuthentication, async (req, res, next) => {
	try {
	if (req.user == undefined || req.user != req.params.id){
		res.status(403).send({error: "The request was not made by an authenticated User satisfying the authorization criteria"});
	}
	else {
		const user = await getUserDetailsById(req.user);
		if (user){
			if (user.role === "student"){
				const taking = await getCoursesByStudent(user._id);
				res.status(200).send({
					name: user.name,
					email: user.email,
					role: user.role,
					taking: taking
				});
			} else if (user.role === "instructor") {
				res.status(200).send({
					name: user.name,
					email: user.email,
					role: user.role,
					teaching: ["empty"]
				});
			} else {
				res.status(200).send({
					name: user.name,
					email: user.email,
					role: user.role
				});
			}
		} else {
			res.status(404).send({error: "Specified User `id` not found."});
		}
	}
	} catch (err){
		console.log(err);
		res.status(500).send({error:"An internal server error occurred."});
	}
});

module.exports = router;
