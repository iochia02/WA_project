/**
 * All the API calls
 */

import dayjs from "dayjs";

const URL = 'http://localhost:3001/api';

// call GET /api/sizes
async function getSizes() {
    const response = await fetch(URL + '/sizes');
    const sizes = await response.json();
    if (response.ok) {
        return sizes;
    } else {
        throw sizes;  // expected to be a json object (coming from the server) with info about the error
    }
}

// call  GET /api/bases
async function getBases() {
    const response = await fetch(URL + '/bases');
    const bases = await response.json();
    if (response.ok) {
        return bases;
    } else {
        throw bases;  // expected to be a json object (coming from the server) with info about the error
    }
}

// call  GET /api/ingredients
async function getIngredients() {
    const response = await fetch(URL + '/ingredients');
    const ingredients = await response.json();
    if (response.ok) {
        return [...ingredients];
    } else {
        throw ingredients;  // expected to be a json object (coming from the server) with info about the error
    }
}

// call  GET /api/orders
// include the credentials in the request since it is an Authenticated API
async function getOrders() {
    const response = await fetch(URL + '/orders',
        { credentials: 'include' });
    const orders = await response.json();
    if (response.ok) {
        return orders.map((e) => ({ id: e.id, userId: e.userId, date: dayjs(e.date), price: e.price, size: e.size, base: e.base, ingredients: e.ingredients, status: undefined }));
    } else {
        throw orders;  // expected to be a json object (coming from the server) with info about the error
    }
}

// call  POST /api/orders
// include the credentials in the request since it is an Authenticated API
function addOrder(order) {
    return new Promise((resolve, reject) => {
        fetch(URL + `/orders`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(order), // new order in JSON format
        }).then((response) => {
            if (response.ok) {
                response.json()
                    // If successful, pass the received order to API.jsx in order to update the list of orders (before it is refetched from the server)
                    .then((order) => resolve(Object.assign({}, order, {date: dayjs(order.date), status: 'added'})))
                    .catch(() => { reject({ error: "Cannot parse server response." }) }); // something else
            } else {
                // analyze the cause of error
                response.json()
                    .then((message) => { reject(message); }) // error message in the response body
                    .catch(() => { reject({ error: "Cannot parse server response." }) }); // something else
            }
        }).catch(() => { reject({ error: "Cannot communicate with the server." }) }); // connection errors
    });
}

// call  DELETE /api/orders/<id>
// include the credentials in the request since it is an Authenticated API
function deleteOrder(id) {
    return new Promise((resolve, reject) => {
        fetch(URL + `/orders/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        }).then((response) => {
            if (response.ok) {
                resolve(null);
            } else {
                // analyze the cause of error
                response.json()
                    .then((message) => { reject(message); }) // error message in the response body
                    .catch(() => { reject({ error: "Cannot parse server response." }) }); // something else
            }
        }).catch(() => { reject({ error: "Cannot communicate with the server." }) }); // connection errors
    });
}

// call POST /api/sessions
async function logIn(credentials) {
    let response = await fetch(URL + '/sessions', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
    });
    if (response.ok) {
        const user = await response.json();
        return user;
    } else {
        const errDetail = await response.json();
        throw errDetail.message;
    }
}

// call  POST /api/login-totp
function totpVerify(totpCode) {
    return new Promise((resolve, reject) => {
        fetch(URL + `/login-totp`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: totpCode }), // pass the TOTP code
        }).then((response) => {
            if (response.ok) {
                response.json()
                    .then(() => resolve())
                    .catch(() => { reject({ error: "Cannot parse server response." }) }); // something else
            } else {
                // analyze the cause of error
                response.json()
                    .then((message) => { reject(message); }) // error message in the response body
                    .catch(() => { reject({ error: "Cannot parse server response." }) }); // something else
            }
        }).catch(() => { reject({ error: "Cannot communicate with the server." }) }); // connection errors
    });
}

// call DELETE /api/sessions/current
async function logOut() {
    await fetch(URL + '/sessions/current', {
        method: 'DELETE',
        credentials: 'include'
    });
}

// call GET /api/sessions/current
async function getUserInfo() {
    const response = await fetch(URL + '/sessions/current', {
        credentials: 'include'
    });
    const userInfo = await response.json();
    if (response.ok) {
        return userInfo;
    } else {
        throw userInfo;  // an object with the error coming from the server
    }
}

const API = {
    getSizes, getBases, getIngredients, getOrders, addOrder, deleteOrder, logIn, logOut, getUserInfo, totpVerify
};
export default API;