const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const { DOMParser } = require('xmldom');
const FormData = require('form-data');
const upload = multer({ storage: multer.memoryStorage() });
const fs = require("fs");
const bcrypt = require('bcrypt');
const app = express();
const { v4: uuidv4 } = require('uuid');
const port = process.env.PORT || 3000;
app.use(express.json());
app.listen(port, () => {
    console.log(`listening to port ${port}`);
});
const DATABASE_FILE = './database.json';
const saltRounds = 10;
const db = require(DATABASE_FILE) 
if(!db.users) db.users = {};
if(!db.sessions) db.sessions  = [];
const save = () => fs.writeFile(DATABASE_FILE, JSON.stringify(db), () => {})

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function AppDateManagement() {
  const currentDate = new Date();
  const millisecondsInDay = 24 * 60 * 60 * 1000;
  const nextDay = new Date(currentDate.getTime() + millisecondsInDay);
  nextDay.setHours(0, 0, 0, 0);
  const timeUntilNextDay = nextDay.getTime() - currentDate.getTime();
  setInterval(() => {
      // console.log("This will be printed once a day");
      Object.values(db.user).forEach((user) => {
          const recentStat = user.sendStats[user.sendStats.length - 1];
          recentStat.data = nextDay;
          user.sendStats.push(recentStat);
      })
      save();
  }, timeUntilNextDay);
}
AppDateManagement();
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// OUR ESSENTIAL HELPERS ////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const getUserObjectFromEmail = (email) => {
  return db.users[email]
}
const getUserObjectFromToken = (token) => {
  if (checkTokenValid(token) === false) {
      console.log('exiting here, invalid token');
      return null
  }
  for (elm of db.sessions) {
      if (elm.token === token) {
          return db.users[elm.email];
      }
  }
  return null
}
const checkTokenValid = (token) => {
  const remove = [];
  let valid = false;
  const currentTime = new Date();
  for (elm of db.sessions) {
      let expiryTime = new Date(elm.expires)
      if (expiryTime < currentTime) {
          remove.push(db.sessions.indexOf(elm));
      }
      if (expiryTime >= currentTime && elm.token === token) {
          valid = true;
      }
  }
  remove.forEach((idx) => {
      db.sessions.splice(idx, 1)
  });
  save();
  return valid;
}
const validateEmail = (email) => {
  return String(email)
      .toLowerCase()
      .match(
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
};

const hasher = (password) => {
  return bcrypt.hash(password, saltRounds).then(function(hash) {
      return hash;
  });
}
const saveFile = (email, file, isValidated) => {
  const newFile = {
      id:  uuidv4(),
      file,
      isValidated,
      sentTo : [],
      madeOn : new Date(),
  }
  db.users[email].files[newFile.id] = newFile;
  save();
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////// OTHER TEAM API CALLS ////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const boostRegisterCall = async (nameFirst, nameLast, email, password) => {
  try {
      const response = await fetch('http://rendering.ap-southeast-2.elasticbeanstalk.com/user/register', {
          method: 'POST',
          headers: {
              'Content-type': 'application/json'
          },
          body: JSON.stringify({
              email: email,
              password: password,
              nameFirst: nameFirst,
              nameLast: nameLast,
          })
      });
      const result_1 = await response.json();
      if (!result_1.error) {
          console.log('registered in successfully, BOOST', result_1);
      } else {
          console.log('There was an error with registering in, BOOST');
          console.log(result_1.error);
      }
      return result_1;
  } catch (error) {
      return console.error(error);
  } 
}

const eggsRegisterCall = async (userName, email, phone, password) => {
  return fetch('https://invoice-seng2021-24t1-eggs.vercel.app/register', {
      method: 'POST',
      headers: {
          'Content-type': 'application/json'
      },
      body: JSON.stringify({
          email: email,
          phone: phone,
          username: userName,
          password: password
        })
  })
  .then((response) => response.json())
  .then((result) => {
      if (result.message.includes("Failed to register")) {
          console.log('did not register in successfully, EEGS', result);
          return result;
      } else {
          console.log('registered in successfully, EEGS', result);
          return eggsLoginCall(userName, password);
      }
  })
  .then((result) => {
      if (result.uid) {
          console.log('login in successfully, EEGS', result);
      } else {
          console.log('did not login in successfully, EEGS', result);
      }
      return result;
  })
  .catch((error) => console.error(error)); 
}

const eggsLoginCall = async (userName, password) => {
  try {
      const response = await fetch('https://invoice-seng2021-24t1-eggs.vercel.app/login', {
          method: 'POST',
          headers: {
              'Content-type': 'application/json'
          },
          body: JSON.stringify({
              username: userName,
              password: password
          })
      });
      const result_1 = await response.json();
      if (result_1.uid) {
          console.log('login in successfully, EEGS', result_1);
      } else {
          console.log('did not login in successfully, EEGS', result_1);
      }
      return result_1;
  } catch (error) {
      return console.error(error);
  } 
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////// OUR FUNCTIONS /////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const register = (nameFirst, nameLast, email, phone, password1, password2) => {
  const username = uuidv4();
  console.log('got called to register');
  if (password1 !== password2) {
      return {"status": 400, "error": "The two passwords do not match"}
  } else if (getUserObjectFromEmail(email)) {
      return {"status": 400, "error": "Email has already been used"}
  } else if ((typeof phone) !== "string" || phone.length !== 10) {
      return {"status": 400, "error": "invalid phone"}
  } else if ((typeof email) !== "string" || !validateEmail(email)) {
      return {"status": 400, "error": "invalid email"}
  } else if ((typeof nameFirst) !== "string") {
      return {"status": 400, "error": "first name given is not a string"};
  } else if ((typeof nameLast) !== "string") {
      return {"status": 400, "error": "last name given is not a string"};
  }
  const boostResultPromise = boostRegisterCall(nameFirst, nameLast, email, password1);
  const eggsResultPromise = eggsRegisterCall(username, email, phone, password1);
  const passwordHash = hasher(password1);
  const callPromises = [boostResultPromise, eggsResultPromise, passwordHash];
  return Promise.all(callPromises).then((callResults => {
      if (callResults[0].error) {
          return {"status": 400, "error": callResults[0].error};
      } else if (!callResults[1].uid) {
          return {"status": 400, "error": callResults[1].message};
      }
      const accountCreationDate = new Date ();
      accountCreationDate.setHours(0,0,0,0);
      const userCreds = {
          "nameFirst": nameFirst, 
          "nameLast": nameLast, 
          "username": username,
          "email": email,
          "phone": phone,
          "passwordHash": callResults[2],
          "boostToken": callResults[0].token,
          "eggsUId": callResults[1].uid,
          "files": {},
          "madeOn": accountCreationDate,
          "sendStats": [{ "date": accountCreationDate, "revenue": 0 }]
      };
      console.log(userCreds);
      
      db.users[userCreds.email] = userCreds;
      const userSession = {
          "email": email,
          "token": uuidv4(),
          "expires": new Date((new Date()).getTime() + 30 * 60 * 1000)
      }
      db.sessions.push(userSession);
      save();
      return {"status": 200, "token": userSession.token};
  }));
}

const login = async (email, password) => {
  const userCreds = db.users[email];
  if (!userCreds) {
      return {"status": 400, "error": "Email does not match any registered emails"}
  }
  const result = await bcrypt.compare(password, userCreds.passwordHash);
  if (result) {
      const userSession = {
          "email": email,
          "token": uuidv4(),
          "expires": new Date((new Date()).getTime() + 30 * 60 * 1000)
      }
      db.sessions.push(userSession);
      save();
      return {"status": 200, "token": userSession.token}
  } else {
      return {"status": 400, "error": "Email id or Password is wrong"}
  }    
}

const logout = (token) => {
  let remove = -1;
  for (session of db.sessions) {
      if (session.token === token) {
          remove = db.sessions.indexOf(session);
      }
  }
  if (remove === -1) {
      return {"status": 400, "error": "Invalid token given, was never made or expired"}
  } else {
      return {"status": 200, "error": "Logged out succesfully"}
  }
}
const renderFile = async (fileId, token) => {
  const formData = new FormData();
//   console.log(file);
  // formData.append("file", file);
  const file = getUserObjectFromToken(token).files[fileId]
  formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
  });
  formData.append("outputType", "PDF");
  formData.append("language", "en");
  formData.append("token", token);
  
  const requestOptions = {
      method: "POST",
      body: formData,
      redirect: "follow"
  };
  
  try {
      const response = await fetch("http://rendering.ap-southeast-2.elasticbeanstalk.com/render", requestOptions);
      const result_1 = await response.json();
      if (result_1.error) {
          console.log('There was an error getting the results');
          console.log(result_1.error);
      }
    //   console.log('Got the results successfully ', token);
    //   console.log('The pdf link ', result_1.PDFURL);
      return (result_1.PDFURL);
  } catch (error) {
      return console.error(error);
  }
}
const sendMultipleInvoiceEmails = async (senderUserName, recipientEmails, fileObjects) => {
  console.log(senderUserName, recipientEmails, fileObjects)
  try {
      const response = await fetch("https://invoice-seng2021-24t1-eggs.vercel.app/send/multiInvoice", {
          method: 'POST',
          headers: {
              'Content-type': 'application/json'
          },
          body: JSON.stringify({
              "from": senderUserName,
              "recipient": recipientEmails,
              "xmlFiles": fileObjects
          })
      });
      const result_1 = await response.json();
      console.log(result_1);
      return result_1;
  } catch (error) {
      console.error(error);
      return error;
  } 
}
function createInvoice(invoiceData, userCred) {
  const raw = JSON.stringify(invoiceData);
  const requestOptions = {
      method: "POST",
      headers: {
          'Content-type': 'application/json'
      },
      body: raw,
      redirect: "follow"
  };

  fetch("https://w13a-brownie.vercel.app/v2/api/invoice/create", requestOptions)
  .then((response) => response.text())
  .then(async (result) => {
      // console.log(result)
      const multerFile = {
          fieldname: 'xml_file',
          originalname: 'invoice.xml',
          encoding: 'utf-8',
          mimetype: 'application/xml',
          buffer: Buffer.from(result),
      };
      // const PDFURL = await renderFile(multerFile, userCred.boostToken)
      saveFile(userCred.email, multerFile, false)
      console.log('added to the datastore successfully');
  })
  .catch((error) => console.error(error));
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////// OUR API ROUTES ////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allowing all origins (not recommended for production)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // If cookies are needed
    next();
});

app.get('/', (req, res) => {
  res.json({
      "msg": `hello world, KHATS here`,
  });
});

// Authentication
app.post('/khats/auth/register', async (req, res) => {
  const { nameFirst, nameLast, email, number, password1, password2 } = req.body;
  return res.json(await register(nameFirst, nameLast, email, number, password1, password2 ));
});

app.post('/khats/auth/login', async (req, res) => {
  const { email, password } = req.body;
  return res.json(await login(email, password));
});

app.delete('/khats/auth/logout', async (req, res) => {
  const { authorization } = req.headers;
  return res.json(logout(authorization));
});
app.get('/khats/auth/checkToken', async (req, res) => {
  const { authorization } = req.headers;
  if (checkTokenValid(authorization)) {
      return res.json({"status": 200, "isValid": true});
  } else {
      return res.json({"status": 200, "isValid": false});
  }
});
//  Storage stuff
app.get('/khats/getAllFileIds', async (req, res) => {
  const { authorization } = req.headers;
  const userCred = getUserObjectFromToken(authorization)
  if (!userCred) {
      return res.json({"status": 400, "error": "Invalid token given"});
  }
  const fileIds = Object.keys(db.user.files)
  return res.json({"status": 200, "fileIds": fileIds});
})
app.get('/khats/getFile', async (req, res) => {
  const { authorization, fileId } = req.headers;
  const userCred = getUserObjectFromToken(authorization)
  if (!userCred) {
      return res.json({"status": 400, "error": "Invalid token given"});
  }
  const file = db.user.files[fileId]
  if (!file) {
      return res.json({"status": 400, "error": "File id does not match any files"});
  }
  return res.json({"status": 200, "file": file});
})
app.get('/khats/getFileContent', async (req, res) => {
  const { authorization, fileId } = req.headers;
  const userCred = getUserObjectFromToken(authorization)
  if (!userCred) {
      return res.json({"status": 400, "error": "Invalid token given"});
  }
  const file = db.user.files[fileId]
  if (!file) {
      return res.json({"status": 400, "error": "File id does not match any files"});
  }
  const fileContent = await getFileContent(file)
  return res.json({"status": 200, "fileContent": fileContent});
})
app.put('/khats/updateFile', async (req, res) => {
  const { authorization, fileId } = req.headers;
  const userCred = getUserObjectFromToken(authorization)
  if (!userCred) {
      return res.json({"status": 400, "error": "Invalid token given"});
  }
  const file = db.user.files[fileId]
  if (!file) {
      return res.json({"status": 400, "error": "File id does not match any files"});
  }
  const newFile = {
      fieldname: 'xml_file',
      originalname: 'invoice.xml',
      encoding: 'utf-8',
      mimetype: 'application/xml',
      buffer: Buffer.from(req.body.invoiceData),
  };
  saveFile(userCred.email, newFile, false);
  return res.json({"status": 200, "message": "successfully updated the file"});
})
// render stuff
app.post('/khats/renderInvoice', upload.single('file'), async (req, res) => {
  const { authorization } = req.headers;
  const userCred = getUserObjectFromToken(authorization)
  console.log(userCred);
  if (!userCred) {
      return res.json({"status": 400, "error": "Invalid token given"});
  }
  const PDFURL = await renderFile(req.fileId, userCred.boostToken)
  return res.json({"status": 200, "url": PDFURL});
})
// send stuff
app.post('/khats/sendMultiple', upload.single('file'), async (req, res) => {
  const { authorization } = req.headers;
  const userCred = getUserObjectFromToken(authorization)
  console.log(userCred);
  if (!userCred) {
      return res.json({"status": 400, "error": "Invalid token given"});
  }
  const { recipient, xmlFiles } = req.body;
  const response = await sendMultipleInvoiceEmails(userCred.username, recipient, xmlFiles)
  return res.json({"status": 200, "response": response});
})
// creation stuff
app.post('/khats/createInvoice', async (req, res) => {
  const { authorization } = req.headers;
  const userCred = getUserObjectFromToken(authorization)
  if (!userCred) {
      return res.json({"status": 400, "error": "Invalid token given"});
  }
  const { invoiceData } = req.body;
  // const response = await sendInvoiceEmailLaterV2(userCred.username, recipient, xmlFiles, delayInMinutes)
  createInvoice(invoiceData, userCred);
  return res.json({"status": 200, "message": "successfully created and added a new invoice"});
})

// stats stuff TODO, HAVENT FINISHED THE BELOW SECTION
app.post('/khats/taxExclusive', upload.array('files'), async (req, res) => {
  const { authorization } = req.headers;
  const userCred = getUserObjectFromToken(authorization)
  console.log(userCred);
  if (!userCred) {
      return res.json({"status": 400, "error": "Invalid token given"});
  }
  for (const file of req.files) {
      totalValue(file);
  }
  return res.json({"status": 200, "message": "testing"});
})

const totalValue = (file) => {
  getFileContent(file)
  .then(result => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(result.xmlString, "text/xml");
      const taxExclusiveAmount = xmlDoc.getElementsByTagName("cbc:TaxExclusiveAmount")[0].textContent;
      const taxInclusiveAmount = xmlDoc.getElementsByTagName("cbc:TaxInclusiveAmount")[0].textContent;
    //   console.log("Tax exclusive amount:", taxExclusiveAmount);
    //   console.log("Tax Amount:", (taxInclusiveAmount - taxExclusiveAmount) + '');
    //   console.log("Tax inclusive amount:", taxInclusiveAmount);
  })
  .catch(error => {
      console.error("Error:", error);
  });
}
function getFileContent(file) {
  return new Promise((resolve, reject) => {
      const content = file.buffer.toString('utf8');
      resolve({"xmlString": content, "filename": file.originalname});
  });
}

function addToSendStats(email, amount) {
  const userObject = db.users[email];
  userObject.sendStats[userObject.sendStats.length - 1].revenue += amount;
  db.users[email] = userObject;
  save();
}