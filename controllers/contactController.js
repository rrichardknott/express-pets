const nodemailer = require("nodemailer");
const validator = require("validator");
const petsCollection = require("../db").db().collection("pets");
const contactsCollection = require("../db").db().collection("contacts");

const { ObjectId } = require("mongodb");
const sanitizeHtml = require("sanitize-html");
const sanitizeOptions = {
  allowedTags: [],
  allowedAttributes: {},
};
exports.submitContact = async function (req, res, next) {
  if (req.body.secret.toUpperCase() !== "PUPPY") {
    console.log("Spam detected");
    return res.json({ message: "Sorry" });
  }

  if (typeof req.body.name != "string") {
    req.body.name = "";
  }
  if (typeof req.body.email != "string") {
    req.body.email = "";
  }
  if (typeof req.body.comment != "string") {
    req.body.comment = "";
  }

  if (!validator.isEmail(req.body.email)) {
    console.log("Invalid Email Detected");
    return res.json({ message: "Sorry" });
  }

  if (!ObjectId.isValid(req.body.petId)) {
    console.log("Invalid Id Detected");
    return res.json({ message: "Sorry" });
  }

  req.body.petId = new ObjectId(req.body.petId);

  const doesPetExist = await petsCollection.findOne({
    _id: req.body.petId,
  });

  if (!doesPetExist) {
    console.log("Pet doesn't exist");
    return res.json({ message: "Sorry" });
  }

  const ourObject = {
    petId: req.body.petId,
    name: sanitizeHtml(req.body.name, sanitizeOptions),
    email: sanitizeHtml(req.body.email, sanitizeOptions),
    comment: sanitizeHtml(req.body.comment, sanitizeOptions),
  };
  console.log(ourObject);
  var transport = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: process.env.MAILTRAPUSERNAME,
      pass: process.env.MAILTRAPPASSWORD,
    },
  });
  try {
    const promise1 = transport.sendMail({
      to: ourObject.email,
      from: "petadoption@localhost.com",
      subject: `Thank you for your interest in ${doesPetExist.name}`,
      html: `<h3 style="color:purple; font-size:30px; font-weight: normal;"></h3>
      <p>We appreciate your interest in ${doesPetExist.name}, One of our staff members will reach out to you shortly.  Please see below for a copy of your email.</p>
      <p><em>${ourObject.comment}</em></p>`,
    });
    const promise2 = transport.sendMail({
      to: "petadoption@localhost.com",
      from: "petadoption@localhost.com",
      subject: `Someone is interested in ${doesPetExist.name}`,
      html: `<h3 style="color:purple; font-size:30px; font-weight: normal;">New Contact!</h3>
     <p>Name: ${ourObject.name}<br>
     Pet Interested In: ${doesPetExist.name}<br>
     Email: ${ourObject.email}<br>
     Message: ${ourObject.comment}
     </p>`,
    });
    const promise3 = await contactsCollection.insertOne(ourObject);
    await Promise.all([promise1, promise2, promise3]);
  } catch (err) {
    next(err);
  }

  res.send("Thanks for sending data to us!");
};

exports.viewPetContacts = async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    console.log("Bad Id");
    return res.redirect("/");
  }
  const pet = await petsCollection.findOne({
    _id: new ObjectId(req.params.id),
  });
  if (!pet) {
    console.log("Pet does not exist.");
    return res.redirect("/");
  }
  const contacts = await contactsCollection
    .find({
      petId: new ObjectId(req.params.id),
    })
    .toArray();
  res.render("pet-contacts", { contacts, pet });
};
