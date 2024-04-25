const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const { DOMParser } = require('xmldom');
// const fetch = require('node-fetch');
const FormData = require('form-data');
// const FormData = require('form-data');
const app = express();
// const fs = require('fs');
// import { v4 as uuidv4 } from 'uuid';
const { v4: uuidv4 } = require('uuid');
// const port = 3001;
const port = process.env.PORT || 3001;
app.use(express.json());
app.listen(port, () => {
    console.log(`listening to port ${port}`);
});
const DATABASE_FILE = './database.json';

// const myPass = 'heyThere#9000';
const saltRounds = 10;

const db = require(DATABASE_FILE) // create a `db.json` file that contains {}
if(!db.users) db.users = {} // initialize an array, if you want db.users to be an array
if(!db.sessions) db.sessions  = {} // initialize an array, if you want db.users to be an array

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allowing all origins (not recommended for production)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // If cookies are needed
    next();
});
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
        Object.values(db.users).forEach((user) => {
            const recentStat = user.sendStats[user.sendStats.length - 1];
            recentStat.data = nextDay;
            user.sendStats.push(recentStat);
        })
        save();
    }, timeUntilNextDay);
}
AppDateManagement();
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// force data base reset and stuff
// ONLY FOR ADMIN
app.put('/khats/forceData', async (req, res) => {
    const { userObject } = req.body;
    if (getUserObjectFromEmail(userObject.email) === null) {
        return {"status": 400, "error": "The email given is not a registered email"}
    }
    db.users[userObject.email] = userObject;
    save()
    return res.json({"status": 200, "message": "Successfully forced data"});
});
app.put('/khats/forceData/sendStats', async (req, res) => {
    const { email, sendStatsArr } = req.body;
    if (getUserObjectFromEmail(email) === null) {
        return {"status": 400, "error": "The email given is not a registered email"}
    }
    db.users[email].sendStats = sendStatsArr;
    save()
    return res.json({"status": 200, "message": "Successfully forced sensStats data"});
});
app.delete('/khats/resetDatastore', async (req, res) => {
    db = {"users": {}, "sessions": []};
    save()
    return res.json({"status": 200, "message": "Successfully restored dataStore"});
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const upload = multer({ storage: multer.memoryStorage() });
const fs = require("fs");
const bcrypt = require('bcrypt');

const save = () => fs.writeFile(DATABASE_FILE, JSON.stringify(db), () => {})

const getUserObjectFromEmail = (email) => {
    return db.users[email]
}
const getUserObjectFromToken = (token) => {
    // if (checkTokenValid(token) === false) {
    //     console.log('exiting here, invalid token', token);
    //     return null
    // }
    // for (elm of db.sessions) {
    //     if (elm.token === token) {
    //         return db.users[elm.email];
    //     }
    // }
    const string = "hey there"
    console.log(string, token);
    // console.log(db.sessions[token]);
    if (!db.sessions[token]) {
        console.log('exiting here, invalid token', token);
        return null
    }
    const email = db.sessions[token].email;
    return db.users[email];
}
// const checkTokenValid = (token) => {
//     // const remove = [];
//     // let valid = false;
//     const currentTime = new Date();
//     console.log('the current time', currentTime)
//     const renewedTime = new Date(currentTime.getTime() + (30 * 60 * 1000))
//     console.log('the renewed time', renewedTime)
//     for (elm of db.sessions) {
        
//         let expiryTime = new Date(elm.expires)
//         console.log(expiryTime)
//         if (expiryTime < currentTime) {
//             remove.push(db.sessions.indexOf(elm));
//         }
//         if (expiryTime >= currentTime && elm.token === token) {
//             // elm.expires = renewedTime;
//             console.log(expiryTime)
//             // elm.expires = renewedTime;
//             db.sessions[db.sessions.indexOf(elm)] = elm;
            
//             valid = true;
//         }
//     }
//     remove.forEach((idx) => {
//         console.log('removing ', db.sessions[idx])
//         db.sessions.splice(idx, 1)
//     });
//     save();
//     return valid;
// }


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
        originalName: file.originalname,
        sentTo : [],
        madeOn : new Date(),
    }
    console.log('saving the file', newFile)
    db.users[email].files[newFile.id] = newFile;
    save();
}
app.get('/khats/getAllFileIds', async (req, res) => {
    const { authorization } = req.headers;
    const userCred = getUserObjectFromToken(authorization)
    if (!userCred) {
        return res.json({"status": 400, "error": "Invalid token given"});
    }
    const fileIds = Object.keys(userCred.files)
    return res.json({"status": 200, "fileIds": fileIds});
})
app.get('/khats/getAllFiles', async (req, res) => {
    const { authorization } = req.headers;
    const userCred = getUserObjectFromToken(authorization)
    if (!userCred) {
        return res.json({"status": 400, "error": "Invalid token given"});
    }
    const files = Object.values(userCred.files)
    return res.json({"status": 200, "files": files});
})
app.get('/khats/getAllFilesData', async (req, res) => {
    const { authorization } = req.headers;
    const userCred = getUserObjectFromToken(authorization)
    if (!userCred) {
        return res.json({"status": 400, "error": "Invalid token given"});
    }
    const filesData = Object.values(userCred.files).map(({ id, isValidated, originalName }) => ({ id, isValidated, originalName }));
    const filesDataReversed = filesData.slice().reverse()
    return res.json({"status": 200, "files": filesDataReversed });
})
app.get('/khats/getFile', async (req, res) => {
    const { authorization, fileId } = req.headers;
    const userCred = getUserObjectFromToken(authorization)
    if (!userCred) {
        return res.json({"status": 400, "error": "Invalid token given"});
    }
    const file = userCred.files[fileId]
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
    const file = userCred.files[fileId]
    if (!file) {
        return res.json({"status": 400, "error": "File id does not match any files"});
    }
    // const fileContent = await getFileContent(file)
    return res.json({"status": 200, "fileContent": file.file.content});
})
app.put('/khats/updateFile', async (req, res) => {
    const { authorization, fileId } = req.headers;
    const userCred = getUserObjectFromToken(authorization)
    if (!userCred) {
        return res.json({"status": 400, "error": "Invalid token given"});
    }
    const file = userCred.files[fileId]
    if (!file) {
        return res.json({"status": 400, "error": "File id does not match any files"});
    }
    const newFile = {
        ...file,
        encoding: 'utf-8',
        mimetype: 'application/xml',
        content: req.body.invoiceData,
    };
    saveFile(userCred.email, newFile, false);
    return res.json({"status": 200, "message": "successfully updated the file"});
})
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
            "creationMadeOn": accountCreationDate,
            "sendStats": [{ "date": accountCreationDate, "revenue": 0 }]
        };
        console.log(userCreds);
        
        db.users[userCreds.email] = userCreds;
        const userSession = {
            "email": email,
            "token": uuidv4(),
        }
        db.sessions[userSession.token] = userSession;
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
        }
        db.sessions[userSession.token] = userSession;
        save();
        return {"status": 200, "token": userSession.token}
    } else {
        return {"status": 400, "error": "Email id or Password is wrong"}
    }    
}

const logout = (token) => {
    // let remove = -1;
    // for (session of db.sessions) {
    //     if (session.token === token) {
    //         remove = db.sessions.indexOf(session);
    //     }
    // }
    // if (remove === -1) {
    //     return {"status": 400, "error": "Invalid token given, was never made or expired"}
    // } else {
    //     return {"status": 200, "error": "Logged out succesfully"}
    // }
    if (db.sessions[token]) {
        delete db.sessions[token];
    }
    return {"status": 200, "message": "Logged out succesfully"}
}



// SERVER END POINTS
app.get('/', (req, res) => {
    res.json({
        "msg": `hello world, KHATS here`,
    });
});

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

// app.get('/khats/auth/getCred', async (req, res) => {
//     const { authorization } = req.headers;
//     console.log(authorization);
//     const userCred = getUserObjectFromToken(authorization)
//     console.log('reached below');
//     if (!userCred) {
//         return {"status": 400, "error": "Invalid token given"};
//     } else {
//         console.log('returning the cred', userCred);
//         return {"status": 200, "credObject": userCred};
//     }
// });

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////// RENDERING /////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const writeFileAsync = (fileName, data) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(fileName, data, { encoding: "utf8" }, (err) => {
            if (err) {
                reject(err);
            } else {
                console.log("File written successfully\n");
                resolve();
            }
        });
    });
};
app.post('/khats/renderInvoice', async (req, res) => {
    const { authorization } = req.headers;
    const { fileId }= req.body
    console.log( authorization, fileId)
    const userCred = getUserObjectFromToken(authorization)
    console.log(userCred);
    if (!userCred) {
        return res.json({"status": 400, "error": "Invalid token given"});
    }
    const userObject = getUserObjectFromToken(authorization);
    const file = userObject.files[fileId].file

    writeFileAsync("render.xml", file.content)
    .then(() => {
        return renderFile(file, userCred.boostToken);
    })
    .then((PDFURL) => {
        // Now you can proceed with the rest of your code
        return res.json({"status": 200, "url": PDFURL});
    })
    .catch((error) => {
        console.error("Error writing file:", error);
    });
})
const renderFile = async (file, boostToken) => {
    const formData = new FormData();
    formData.append("outputType", "PDF");
    formData.append("language", "en");
    formData.append("token", boostToken);
    formData.append('file', fs.createReadStream('./render.xml'))
    console.log(file);
    const requestOptions = {
        method: "POST",
        body: formData,
        redirect: "follow"
    };
    
    try {
        console.log('start of the try block');
        const response = await fetch("http://rendering.ap-southeast-2.elasticbeanstalk.com/render", requestOptions);
        console.log(response);
        const result_1 = await response.json();
        if (result_1.error) {
            console.log('There was an error getting the results');
            console.log(result_1.error);
        }
        console.log('The pdf link ', result_1.PDFURL);
        return (result_1.PDFURL);
    } catch (error) {
        return console.error(error);
    }
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////// SENDING /////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/khats/sendMultiple', upload.single('file'), async (req, res) => {
    const { authorization } = req.headers;
    const userCred = getUserObjectFromToken(authorization)
    console.log(userCred);
    if (!userCred) {
        return res.json({"status": 400, "error": "Invalid token given"});
    }
    const fileObjects = []
    const { recipient, fileIds } = req.body;
    console.log(recipient, fileIds)
    for (const fileId of fileIds) {
        const file = userCred.files[fileId].file
        addToSendStats(userCred.email, file.content)
        fileObjects.push({"xmlString": file.content, "filename": file.originalname})
    }
    const response = await sendMultipleInvoiceEmails(`${userCred.nameFirst} ${userCred.nameLast}`, recipient, fileObjects)
    return res.json({"status": 200, "response": response});
})
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
  
app.post('/khats/sendMultipleLater', upload.single('file'), async (req, res) => {
    const { authorization } = req.headers;
    const userCred = getUserObjectFromToken(authorization)
    console.log(userCred);
    if (!userCred) {
        return res.json({"status": 400, "error": "Invalid token given"});
    }
    const { recipient, xmlFiles, delayInMinutes } = req.body;
    const response = await sendInvoiceEmailLaterV2(userCred.username, recipient, xmlFiles, delayInMinutes)
    return res.json({"status": 200, "response": response});
})
const sendInvoiceEmailLaterV2 = async (senderUserName, recipientEmail, fileContent, delay) => {
    console.log(senderUserName, recipientEmail, fileContent, delay)
    try {
        const response = await fetch("https://invoice-seng2021-24t1-eggs.vercel.app/send/invoiceLater", {
            method: 'POST',
            headers: {
                'Content-type': 'application/json'
            },
            body: JSON.stringify({
                "type": "xml",
                "from": senderUserName,
                "recipient": recipientEmail,
                "content": fileContent,
                "delayInMinutes": delay
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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/khats/getRevenue', upload.array('files'), async (req, res) => {
    const { authorization } = req.headers;
    const userCred = getUserObjectFromToken(authorization)
    console.log(userCred);
    if (!userCred) {
        return res.json({"status": 400, "error": "Invalid token given"});
    }
    // for (const file of req.files) {
    //     totalValue(file);
    // }
    return res.json({"status": 200, "data": userCred.sendStats});
})

const getTaxExclusiveValue = (xmlString) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    let taxExclusiveAmountValue = xmlDoc.getElementsByTagName("cbc:TaxExclusiveAmount")[0].textContent;
    taxExclusiveAmountValue = parseInt(taxExclusiveAmountValue);
    console.log(typeof taxExclusiveAmountValue);
    return taxExclusiveAmountValue;
}

// const totalValue = (file) => {
//     return getFileContent(file)
//     .then(result => {
//         const parser = new DOMParser();
//         const xmlDoc = parser.parseFromString(result.xmlString, "text/xml");
//         const taxExclusiveAmount = xmlDoc.getElementsByTagName("cbc:TaxExclusiveAmount")[0].textContent;
//         const taxInclusiveAmount = xmlDoc.getElementsByTagName("cbc:TaxInclusiveAmount")[0].textContent;
//         console.log("Tax exclusive amount:", taxExclusiveAmount);
//         console.log("Tax Amount:", (taxInclusiveAmount - taxExclusiveAmount) + '');
//         console.log("Tax inclusive amount:", taxInclusiveAmount);
//         return taxExclusiveAmount;
//     })
//     .catch(error => {
//         console.error("Error:", error);
//     });
// }
function getFileContent(file) {
    console.log(file);
    return new Promise((resolve, reject) => {
        const content = file.buffer.toString('utf8');
        resolve({"xmlString": content, "filename": file.originalname});
    });
}

function addToSendStats(email, fileContent) {
    const amount = getTaxExclusiveValue(fileContent);
    const userObject = db.users[email];
    let revenueNumber = parseInt(userObject.sendStats[userObject.sendStats.length - 1].revenue)
    userObject.sendStats[userObject.sendStats.length - 1].revenue = revenueNumber + amount;
    db.users[email] = userObject;
    save();
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////// Creation /////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/khats/createInvoice', async (req, res) => {
    const { authorization } = req.headers;
    const userCred = getUserObjectFromToken(authorization)
    if (!userCred) {
        return res.json({"status": 400, "error": "Invalid token given"});
    }
    const { invoiceData, invoiceName } = req.body;
    // const response = await sendInvoiceEmailLaterV2(userCred.username, recipient, xmlFiles, delayInMinutes)
    createInvoice(invoiceData, userCred, invoiceName);
    return res.json({"status": 200, "message": "successfully created and added a new invoice"});
})

function createInvoice(invoiceData, userCred, invoiceName) {
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
            originalname: invoiceName,
            encoding: 'utf-8',
            mimetype: 'application/xml',
            content: result,
        };
        saveFile(userCred.email, multerFile, false)
        console.log('added to the datastore successfully');
    })
    .catch((error) => console.error(error));
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////// validation ///////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/khats/validateInvoice', upload.single('file'), async (req, res) => {
    const { authorization } = req.headers;
    const userCred = getUserObjectFromToken(authorization)
    if (!userCred) {
        return res.json({"status": 400, "error": "Invalid token given"});
    }
    const responsePromise = validateInvoice(req.file)
    responsePromise.then((response) => {
        console.log('the response ', response);
        if (!response) {
            console.log(response)
            return res.json({"status": 400, "error": "Malformed request. Could not parse body as XML."});
        } else {
            return res.json({"status": 200, "url": response});

        }
    })

})

const validateInvoice = (file) => {
    // formData.append('file', file)
    return getFileContent(file).then((fileData) => {
        // console.log(fileData)
        console.log('got the file data')
        return fetch("https://adica.netlify.app/v2/validate?format=pdf&selfbilling=false", {
            method: 'POST',
            headers: {
                'Content-type': 'application/xml' 
            },
            body: fileData.xmlString
        })
        .then((response) => {
            console.log('middle response', response)
            return response.json()
        })
        .then((result) => {
            console.log('the result from adica', result)
            if (!result.url) {
                return null
            } else {
                return result.url
            }
        })
    })
    // const requestOptionPost = {
    //     method: "POST",
    //     body: formData,
    //     redirect: "follow"
    // };

    // try {
    //     const response = await fetch("http://asish.alwaysdata.net/invoice-validator/upload-invoice", requestOptionPost);
    //     const result_1 = await response.json();
    //     if (result_1.error) {
    //         console.log('There was an error getting the results');
    //         console.log(result_1.error);
    //         return result_1.error;
    //     }
    //     const validationResponse = await fetch("http://asish.alwaysdata.net/invoice-validator/upload-invoice",
    //     {
    //         method: ""
    //     }
    //   //   console.log('Got the results successfully ', token);
    //   //   console.log('The pdf link ', result_1.PDFURL);
    //     // return (result_1.PDFURL);
    // } catch (error) {
    //     return console.error(error);
    // }
}