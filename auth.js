const express = require('express');
const fetch = require('node-fetch');
const app = express();
// import { v4 as uuidv4 } from 'uuid';
const { v4: uuidv4 } = require('uuid');
// const port = 3001;
const port = process.env.PORT || 3000;
app.use(express.json());
app.listen(port, () => {
    console.log(`listening to port ${port}`);
});
const DATABASE_FILE = './database.json';

const myPass = 'heyThere#9000';
const saltRounds = 10;

const db = require(DATABASE_FILE) // create a `db.json` file that contains {}
if(!db.users) db.users = [] // initialize an array, if you want db.users to be an array
if(!db.sessions) db.sessions = [] // initialize an array, if you want db.users to be an array

const fs = require("fs");
const bcrypt = require('bcrypt');
// const { toNamespacedPath } = require('node:path/posix');
const save = () => fs.writeFile(DATABASE_FILE, JSON.stringify(db), () => {})
// try {
//     const data = JSON.parse(fs.readFileSync(DATABASE_FILE));
//     users = data.users;
// } catch {
//     console.log('WARNING: No database found, create a new one');
//     save();
// }

const getUserObjectFromEmail = (email) => {
    for (elm of db.users) {
        if (elm.email === email) {
            return elm;
        }
    }
    return null
}
const getUserObjectFromToken = (token) => {
    for (elm of db.sessions) {
        if (elm.token === token) {
            return getUserObjectFromEmail(elm.email);
        }
    }
    return null
}
const checkTokenValid = (token) => {
    const remove = [];
    let valid = false;
    const currentTime = new Date(dt.getTime());
    for (elm of db.sessions) {
        if (elm.expires < currentTime) {
            remove.push(db.sessions.indexOf(elm));
        }
        if (elm.expires >= currentTime && elm.token === token) {
            valid = true;
        }
    }
    remove.forEach((idx) => {db.sessions.splive(idx, 1)});
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




const boostRegisterCall = (nameFirst, nameLast, email, password) => {
    return fetch('http://rendering.ap-southeast-2.elasticbeanstalk.com/user/register', {
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
    })
    .then((response) => response.json())
    .then((result) => {
        if (!result.error) {
            console.log('registered in successfully, BOOST', result);
        } else {
            console.log('There was an error with registering in, BOOST');
            console.log(result.error);
        }
        return result;
    })
    .catch((error) => console.error(error)); 
}

const eggsRegisterCall = (userName, email, phone, password) => {
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

const eggsLoginCall = (userName, password) => {
    return fetch('https://invoice-seng2021-24t1-eggs.vercel.app/login', {
        method: 'POST',
        headers: {
            'Content-type': 'application/json'
        },
        body: JSON.stringify({
            username: userName,
            password: password
          })
    })
    .then((response) => response.json())
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


// const register = (nameFirst, nameLast, email, phone, password1, password2) => {
//     const username = uuidv4();
//     console.log('got called to register');
//     if (password1 !== password2) {
//         return {"status": 400, "error": "The two passwords do not match"}
//     } else if (getUserObjectFromEmail(email) !== null) {
//         return {"status": 400, "error": "Email has already been used"}
//     } else if ((typeof phone) !== "string" || phone.length !== 10) {
//         return {"status": 400, "error": "invalid phone"}
//     } else if ((typeof email) !== "string" || !validateEmail(email)) {
//         return {"status": 400, "error": "invalid email"}
//     } else if ((typeof nameFirst) !== "string") {
//         return {"status": 400, "error": "first name given is not a string"};
//     } else if ((typeof nameLast) !== "string") {
//         return {"status": 400, "error": "last name given is not a string"};
//     }
//     const boostResultPromise = boostRegisterCall(nameFirst, nameLast, email, password1);
//     const eggsResultPromise = eggsRegisterCall(username, email, phone, password1);
//     const passwordHash = hasher(password1);
//     const callPromises = [boostResultPromise, eggsResultPromise, passwordHash];
//     Promise.all(callPromises).then((callResults => {
//         if (callResults[0].error) {
//             return {"status": 400, "error": callResults[0].error};
//         } else if (!callResults[1].uid) {
//             return {"status": 400, "error": callResults[1].message};
//         }
//         const userCreds = {
//             "nameFirst": nameFirst, 
//             "nameLast": nameLast, 
//             "username": username,
//             "email": email,
//             "phone": phone,
//             "passwordHash": callResults[2],
//             "boostToken": callResults[0].token,
//             "eggsUId": callResults[1].uid,
//         };
//         console.log(userCreds);
        
//         db.users.push(userCreds);
//         const userSession = {
//             "email": email,
//             "token": uuidv4(),
//             "expires": new Date((new Date()).getTime() + 30 * 60 * 1000)
//         }
//         db.sessions.push(userSession);
//         save();
//         return {"status": 200, "token": userSession.token};
//     }));

// }
const register = (nameFirst, nameLast, email, phone, password1, password2) => {
    const username = uuidv4();
    console.log('got called to register');
    if (password1 !== password2) {
        return {"status": 400, "error": "The two passwords do not match"}
    } else if (getUserObjectFromEmail(email) !== null) {
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
        const userCreds = {
            "nameFirst": nameFirst, 
            "nameLast": nameLast, 
            "username": username,
            "email": email,
            "phone": phone,
            "passwordHash": callResults[2],
            "boostToken": callResults[0].token,
            "eggsUId": callResults[1].uid,
        };
        console.log(userCreds);
        
        db.users.push(userCreds);
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
    const userCreds = getUserObjectFromEmail(email);
    if (!userCreds) {
        return {"status": 400, "error": "Email does not match any registered emails"}
    }
    const result = await bcrypt.compare(password, userCreds.passwordHash);
    
    if (result) {
        return {"status": 200, "token": uuidv4()}
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



// SERVER END POINTS
app.get('/', (req, res) => {
    res.json({
        "msg": `hello world, KHATS here`,
    });
});

app.post('/khats/auth/register', async (req, res) => {
    const { nameFirst, nameLast, email, number, password1, password2 } = req.body;
    return res.json(await register(nameFirst, nameLast, email, number, password1, password2));
});

app.post('/khats/auth/login', async (req, res) => {
    const { email, password } = req.body;
    return res.json(login(email, password));
});

app.delete('/khats/auth/logout', async (req, res) => {
    const { authorization } = req.headers;
    return res.json(logout(authorization));
});
app.put('/khats/auth/checkToken', async (req, res) => {
    const { authorization } = req.headers;
    if (checkTokenValid(authorization)) {
        return res.json({"status": 200, "isValid": true});
    } else {
        return res.json({"status": 200, "isValid": false});
    }
});