'use strict';
/* Data Access Object (DAO) module for accessing the ingredients */

const sqlite = require('sqlite3');
const dayjs = require('dayjs');

// open the database
const db = new sqlite.Database('restaurant.db', (err) => {
    if (err) throw err;
});

/**
 * Retrieve the list of dish sizes from the DB
 *
 * @returns a Promise that resolves to the list of sizes
 *          objects as: {size, prize, numIngredients}
 */
exports.getSizes = () => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM sizes';
        // Retrieve the sizes from the DB
        db.all(sql, [], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(rows);
        });
    });
};

/**
 * Retrieve a dish base given the name from the db
 *
 * @returns a Promise that resolves to the base
 *          object
 */
exports.getSizeByName = (size) => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM sizes WHERE size = ?';
        // Retrieve the size from the DB
        db.get(sql, [size], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(row);
        });
    });
};

/**
 * Retrieve the list of dish bases from the db
 *
 * @returns a Promise that resolves to the list of bases
 *          objects as: {base}
 */
exports.getBases = () => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM bases';
        // Retrieve the sizes from the DB
        db.all(sql, [], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(rows);
        });
    });
};

/**
 * Retrieve a dish base given the name from the db
 *
 * @returns a Promise that resolves to the base
 *          object
 */
exports.getBaseByName = (base) => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM bases WHERE base = ?';
        // Retrieve the sizes from the DB
        db.get(sql, [base], (err, row) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(row);
        });
    });
};

/**
 * Retrieve the list of all ingredients from the db
 *
 * @returns a Promise that resolves to the list of ingredients
 *          objects as: {name, price, quantity, requires, incompatibles: [...]}
 */
exports.getIngredients = () => {
    return new Promise((resolve, reject) => {
        const sqlIngredients = 'SELECT * FROM ingredients';
        const sqlIncompatibilities = 'SELECT * FROM incompatibilities'
        // Retrieve the ingredients from the DB
        db.all(sqlIngredients, [], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            // Retrieve the incompatibilities from the DB
            db.all(sqlIncompatibilities, [], (errIncompatibilities, rowsIncompatibilities) => {
                if (errIncompatibilities) {
                    reject(errIncompatibilities);
                    return;
                }
                // Map the list of ingredients to an object that includes also the incompatibilities array
                const ingredients = rows.map((e) => ({ ...e, incompatibilities: [] }));

                for (const { ingredient1, ingredient2 } of rowsIncompatibilities) {
                    // Append incompatibility to the correct ingredient
                    // If ham is incompatible with mushrooms, also the reverse is true
                    const row1 = ingredients.find(i => i.name === ingredient1);
                    row1.incompatibilities.push(ingredient2);
                    const row2 = ingredients.find(i => i.name === ingredient2);
                    row2.incompatibilities.push(ingredient1);
                };

                resolve(ingredients);

            });
        });
    });
};

/**
 * Retrieve the list of all orders associated to that user from the db
 * @param userId id of the user
 * @returns a Promise that resolves to the list of orders
 *          objects as: {id, userID, date, price, size, base, ingredients: [...]}
 */
exports.getOrders = (userId) => {
    return new Promise((resolve, reject) => {
        const sqlOrders = 'SELECT * FROM orders WHERE userId = ?';
        const sqlIngredientOrders = 'SELECT * FROM ordersIngredients';

        // Retrieve the orders from the DB
        db.all(sqlOrders, [userId], (err, rowsOrders) => {
            if (err) {
                reject(err);
                return;
            }
            // If the user has not performed any order, resolve the promise to an empty array
            // To avoid doing a second useless query to the db
            if (rowsOrders.length == 0) {
                resolve(rowsOrders);
                return;
            }
            // Retrieve all the ingredients associated to the orders
            db.all(sqlIngredientOrders, [], (errIngredients, rowsIngredients) => {
                if (errIngredients) {
                    reject(errIngredients);
                    return;
                }

                // For each order of the user, append the list of ingredients
                const orders = rowsOrders.map((e) => ({ id: e.id, userId: e.userId, date: dayjs(e.date), price: e.price, size: e.size, base: e.base }));
                for (let order of orders) {
                    order['ingredients'] = rowsIngredients.filter((e) => e.orderId === order.id).map((e) => e.ingredient);
                }

                resolve(orders);
            });
        });
    });
};

/**
 * Retrieve an order associated to a user from the db
 * @param id id of the order
 * @param userId id of the user
 * @returns a Promise that resolves to the an order
 *          objects as: {id, userID, date, price, size, base, ingredients: [...]}
 */
exports.getOrderById = (id, userId) => {
    return new Promise((resolve, reject) => {
        const sqlOrder = 'SELECT * FROM orders WHERE id = ? AND userId = ?';
        const sqlIngredients = 'SELECT * FROM ordersIngredients WHERE orderId = ?'
        // Retrieve the order from the DB
        db.get(sqlOrder, [id, userId], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            // If no order of that user has that id, return
            if (row === undefined) {
                resolve(row);
                return;
            }
            const order = { id: row.id, userId: row.userId, date: dayjs(row.date), price: row.price, size: row.size, base: row.base };
            // Retrieve the order ingredients from the DB
            db.all(sqlIngredients, [id], (errIngredients, rowsIngredients) => {
                if (errIngredients) {
                    reject(errIngredients);
                    return;
                }
                // Add the list of ingredients to the order
                order['ingredients'] = rowsIngredients.map((e) => e.ingredient);

                resolve(order);
            });
        });
    });
};


/**
 * Helper function, it allows to get a promise wrapping the db.run funtion for accessing to the db
 * It is used to run queries in order in the createOrder and deleteOrder functions
 * @param sql query to run
 * @param params parameters to pass to the query
 * @returns a Promise that resolves to the listId (in case of an insertion)
 */
async function runQueryAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve(this.lastID);
        });
    });
}

/**
 * Helper function, it allows to get a promise wrapping the db.get funtion for accessing to the db
 * It is used to run queries in order in the createOrder and deleteOrder functions
 * It updates the quantity of an ingredient in such operations, checking that it is consistent
 * @param sql query to run
 * @param ingredient parameter to pass to the query
 * @returns a Promise that resolves to the quantity available of that ingredient
 */
async function updateIngredientQuantityAsync(sql, ingredient) {
    return new Promise((resolve, reject) => {
        db.get(sql, ingredient, function (err, row) {
            if (err) return reject(err);
            if (row != undefined && row.quantity < 0) return reject({"code": 'NOT_AVAILABLE', "msg": `One of the chosen ingredients (${ingredient}) is no more available.`});
            resolve(row);
        });
    });
}

/**
 * Create an order
 * @param order object containg the order to insert into the database
 * @returns a Promise that resolves to the newly created object as:
 *           {id, userID, date, price, size, base, ingredients: [...]}
 */
exports.createOrder = (order) => {
    return new Promise((resolve, reject) => {
        // Since we have await calls we need an wrapping async function
        (async () => {
            try {
                // We need to perform a transaction, since we are updating different tables together
                // If something goes wrong at some stage we need to go back to the initial state (rollback)
                await runQueryAsync("BEGIN TRANSACTION");

                // Update the quantities of the ingredients in the order and verify that we have enough of each of them
                for (let ingredient of order.ingredients) {
                    await updateIngredientQuantityAsync("UPDATE ingredients SET quantity = quantity - 1 WHERE name = ? AND quantity IS NOT NULL RETURNING quantity", [ingredient]);
                }

                // Insert the new order and get back its id
                const id = await runQueryAsync("INSERT INTO orders(userId, date, price, size, base) VALUES(?, DATE(?), ?, ?, ?);", [order.userId, order.date, order.price, order.size, order.base]);

                // Add the ingredients related to the order in the table ordersIngredients
                for (let ingredient of order.ingredients) {
                    runQueryAsync("INSERT INTO ordersIngredients(orderId, ingredient) values(?, ?)", [id, ingredient]);
                };

                // If everything went fine, commit the changes
                await runQueryAsync("COMMIT");
                // Resolve the promise with the newly created object (retrieved from the db)
                resolve(exports.getOrderById(id, order.userId));
            } catch (err) {
                // In case of error, rollback the changes and reject the promise
                db.run("ROLLBACK", () => reject(err));
            }
        })() // call the async function
    });
}

/**
 * Delete an order
 * @param orderId id of the order to delete
 * @param userId id of the user
 * @returns a Promise that resolves to the number of modified rows:
 *           0 if the order with that id does not exists for the user
 *           1 if the order was correctly cancelled
 */
exports.deleteOrder = (orderId, userId) => {
    return new Promise((resolve, reject) => {
        // Since we have await calls we need an wrapping async function
        (async () => {
            try {
                // We need to perform a transaction, since we are updating different tables together
                // If something goes wrong at some stage we need to go back to the initial state (rollback)
                await runQueryAsync("BEGIN TRANSACTION");

                const order = await exports.getOrderById(orderId, userId);
                // No order found with that id for that user
                // Terminate the transaction and resolve the promise (0 lines changed)
                if (order === undefined) {
                    await runQueryAsync("COMMIT");
                    resolve(0);
                    return;
                }
                // Update the quantities for the ingredients in the order and verify that we have enough of each of them
                for (let ingredient of order.ingredients) {
                    await updateIngredientQuantityAsync("UPDATE ingredients SET quantity = quantity + 1 WHERE name = ? AND quantity IS NOT NULL RETURNING quantity", [ingredient]);
                }
                // Delete the rows with the ingredients related to that order in the table ordersIngredients
                // We already checked that the user "owns" that order getting the order from the db with the function getOrderById
                await runQueryAsync("DELETE FROM ordersIngredients WHERE orderId = ?", [order.id]);
                // Delete the order
                await runQueryAsync("DELETE FROM orders WHERE id = ? AND userId = ?", [order.id, order.userId]);
                // If everything went fine, commit the changes
                await runQueryAsync("COMMIT");
                // Resolve the promise
                resolve(1);
            } catch (err) {
                // In case of error, rollback the changes and reject the promise
                db.run("ROLLBACK", () => reject(err));
            }
        })() // call the async function
    });
}
