import { useState, useEffect } from 'react';
import { Button, Form, Row, Col, Badge, Container } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router';

function OrderConfigurator(props) {

    function handleSubmit(event) {
        event.preventDefault(); // to avoid reloading the page

        // create the new order objet to send to the server
        const order = {
            size: sizes.find((s) => s.selected).size,
            base: base,
            ingredients: ingredients.filter((i) => i.selected).map((i) => i.name),
            price: computePrice()
        }
        props.addOrder(order);
        // remain on this page until the server says that everything is fine and the order has been correctly added
    }


    /* Function to set/update the ingredients state:
     * @param list: old list of ingredients, current state to update
     * @param modified: ingredient whose checkbox was checked/unchecked
     * @param newValue: checked = true/false
     * @param newSize: in case the ingredients list was not changed but the size list was, that is the new select size
     * @param objToShow: in case we want to show the info about the order #id, the object representing the order
     * @returns list: the updated list of ingredients
     *
     * The state is an array of objects {name, selected, disabled, msg, variant}, one for each ingredient:
     *       name is the name of the ingredient
     *       selected indicates whether the ingredient checkbox has been selected
     *       disabled indicates whether the ingredient checkbox has to be selected for some reason
     *       msg indicates why the ingredient checkbox has been disabled
     *       variant is just for styling the message tags
    */
    function ingredientsCheckboxUpdate(list, modified, newValue, newSize, objToShow = undefined) {
        // If no list was defined (the first time in which we set the state), create the list
        if (!list) {
            list = [];
            if (!objToShow) {
                // since we are at the beginning, no ingredients have been yet selected
                for (let i of props.ingredients)
                    list = list.concat({ "name": i.name, "selected": false, "disabled": false, "msg": "", "variant": "danger" });
            } else {
                // we want to show the order #id, so we select the chosen orders and we disable the other ones
                for (let i of props.ingredients)
                    if (objToShow.ingredients.includes(i.name))
                        list = list.concat({ "name": i.name, "selected": true, "disabled": false, "msg": "", "variant": "danger" });
                    else
                        list = list.concat({ "name": i.name, "selected": false, "disabled": true, "msg": "", "variant": "danger" });
                // return the list, since the order has already been processed we don't care about incompatibilities or other problems
                return list;
            }
        } else {
            // an ingredient checkbox has been selected/unselected: update its value
            // keep the other ingredients selections as they were
            // reset disabled and msg (new incompatibilities may have risen,...)
            list = list.map((i) => {
                if (i.name === modified)
                    return { "name": i.name, "selected": newValue, "disabled": false, "msg": "", "variant": "danger" };
                else
                    return { "name": i.name, "selected": i.selected, "disabled": false, "msg": "", "variant": "danger" };
            });
        }

        // Disable the ingredients that are not available (quantity = 0)
        list = list.map((i) => {
            let quantity = props.ingredients.find((r) => i.name === r.name).quantity;
            if (quantity === null)
                return i;
            // if the quantity is equal to zero, disable the ingredient
            if (quantity <= 0)
                return { "name": i.name, "selected": false, "disabled": true, "msg": `Not available`, "variant": "warning" };
            else
                return i;
        });

        // Disable the required ingredients for which the ingredients that require them are selected
        list = list.map((i) => {
            // i is required by another ingredient?
            let requiresYou = props.ingredients.find((r) => i.name === r.requires);
            if (!requiresYou)
                return i;
            let requiresYouObj = list.find((r) => r.name === requiresYou.name);
            // if the required ingredient and the ingredient are both selected, the required one cannot be removed
            if (requiresYouObj.selected && i.selected)
                return { "name": i.name, "selected": true, "disabled": true, "msg": `This ingredient is required by: ${requiresYou.name}`, "variant": "secondary" };
            else
                return i;
        });

        // Verify that the number of ingredients is coherent with the chosen size (that can have been updated)
        const actualSize = newSize ? newSize : sizes.find((s) => s.selected).size;
        const maxIngredients = props.sizes.find((s) => s.size === actualSize).maxIngredients;
        if (list.filter((i) => i.selected === true).length >= maxIngredients) {
            list = list.map((i) => {
                if (!i.selected && i.msg === "") // disable not selected ingredients, but don't overwrite messages set previously (like "ingredient not available")
                    return { "name": i.name, "selected": false, "disabled": true, "msg": `With a ${actualSize} dish you can select up to ${maxIngredients} ingredients.`, "variant": "primary" };
                else
                    return i;
            });
            return list; // at this point the user cannot do anything else and doesn't care about incompatibilities,...
        }

        // Disable the ingredients for which the required ingredient is not present
        list = list.map((i) => {
            // i has a required ingredient?
            let required = props.ingredients.find((r) => i.name === r.name).requires;
            if (!required)
                return i;
            // if yes, check if it is selected, otherwise disable i
            let requiredObj = list.find((r) => r.name === required);
            if (!requiredObj.selected && i.msg === "") // don't overwrite messages set previously (like "ingredient not available")
                return { "name": i.name, "selected": false, "disabled": true, "msg": `Required ingredient missing: ${required}`, "variant": "danger" };
            else
                return i;
        });

        // Disable the incompatible ingredients if one has already been selected
        list = list.map((i) => {
            // Get the ingredients incompatibles with i
            let incompatibles = props.ingredients.find((r) => i.name === r.name).incompatibilities;
            // Check if an incompatible ingredient has already been selected, in that case, disable i
            if (incompatibles.length == 0) {
                return i;
            }
            for (let incompat of incompatibles) {
                // Pick the first incompatible ingredient selected found
                if (list.find((r) => r.name === incompat).selected && i.msg === "") // don't overwrite messages set previously (like "ingredient not available")
                    return { "name": i.name, "selected": false, "disabled": true, "msg": `Incompatible ingredient selected: ${incompat}`, "variant": "danger" };
            }
            // No incompatibility problems
            return i;
        });

        return list;
    };

    /* Function to update the size state:
     * @param list: old sizes list state, to be updated
     * @param selectedSize: new size that has been selected
     * @param numIngredients: number of ingredients currently selected
     * @param objToShow: in case we want to show the info about the order #id, the object representing the order
     * @returns list: the updated list of sizes
     * The state is an array of objects {size, selected, disabled, msg}, one for each size:
     *      size is the name of the size
     *      selected indicates whether the size has been selected
     *      disabled is used to prevent the user from choosing a smaller size when too many ingredients have already been selected
     *      msg explains the problem
    */
    function sizeRadioUpdate(list, selectedSize, numIngredients, objToShow = undefined) {
        // If no list was define (first time in which the state is set), create the list
        let maxIngredients;
        if (!list) {
            list = [];
            if (!objToShow) {
                // At the beginning, the default size is selected by default
                for (let s of props.sizes)
                    if (s.size === selectedSize)
                        list = list.concat({ "size": s.size, "selected": true, "disabled": false, "msg": "" });
                    else
                        list = list.concat({ "size": s.size, "selected": false, "disabled": false, "msg": "" });
            } else {
                // If we are showing the order #id, the chosen size is selected, the others are disabled
                for (let s of props.sizes)
                    if (s.size === objToShow.size)
                        list = list.concat({ "size": s.size, "selected": true, "disabled": false, "msg": "" });
                    else
                        list = list.concat({ "size": s.size, "selected": false, "disabled": true, "msg": "" });
            }

        } else {
            // Update the list with the chosen size (that can be changed or not)
            list = list.map((s) => {
                if (s.size === selectedSize)
                    return { "size": s.size, "selected": true, "disabled": false, "msg": "" };
                else {
                    // If the number of ingredients currently chosen by the user is higher then the max number supported by that size, disable the option
                    maxIngredients = props.sizes.find((e) => e.size === s.size).maxIngredients;
                    if (numIngredients > maxIngredients) {
                        return { "size": s.size, "selected": false, "disabled": true, "msg": `With this size you can choose only ${maxIngredients} ingredients (now ${numIngredients})` };
                    }
                    else
                        return { "size": s.size, "selected": false, "disabled": false, "msg": "" };
                };
            }
            );
        }

        return list; // return the updated sizes list, to update the state
    }

    // Function to compute the total price of an order
    function computePrice() {
        let price = 0;
        // Nothing as been assigned yet, the price is 0
        if (!ingredients || !sizes)
            return price;
        // If no ingredients have been selected, the price is the one of the base
        const selectedSize = props.sizes.find((e) => sizes.find((s) => s.size === e.size && s.selected));
        price = selectedSize.price;
        // Add the price of selected ingredients
        const selectedIngredients = props.ingredients.filter((e) => ingredients.find((i) => i.name === e.name && i.selected));
        if (selectedIngredients.length != 0)
            price += selectedIngredients.map((e) => e.price).reduce((a, b) => a + b, 0);
        return price;
    }

    // If we are in the info section of an order, retrieve the order object from the list
    // In that case, the options related to what was chosen during the ordering phase are already selected and cannot be modified
    // The other options are simply disabled
    const { orderId } = useParams();
    const objToShow = props.orders && props.orders.find(e => e.id === parseInt(orderId));

    /* Set the initial states (size=small, base=pizza, no ingredient chosen)
     * sizes: it is an array of objects {size, selected, disabled, msg}, one for each size:
     *       size is the name of the size
     *       selected indicates whether the size has been selected
     *       disabled is used to prevent the user from choosing a smaller size when too many ingredients have already been selected
     *       msg explains the problem
     * base: it stores the name of the selected base
     * ingredients: it is an array of objects {name, selected, disabled, msg, variant}, one for each ingredient:
     *              name is the name of the ingredient
     *              selected indicates whether the ingredient checkbox has been selected
     *              disabled indicates whether the ingredient checkbox has to be selected for some reason
     *              msg indicates why the ingredient checkbox has been disabled
     *              variant is just for styling the message tags
    */

    const defaultSize = "small";
    const [sizes, setSizes] = useState(sizeRadioUpdate(undefined, defaultSize, 0, objToShow));
    const [base, setBase] = useState('pizza');
    const [ingredients, setIngredients] = useState(ingredientsCheckboxUpdate(undefined, undefined, false, defaultSize, objToShow));
    const navigate = useNavigate();

    // To update the list of ingredients in case the refetch included some modifications
    // e.g. in the meanwhile somebody bought the last item/cancelled the order so that the product is again available
    useEffect( ()=> {
        if (!objToShow) // the re-rendering has sense only if we are not in the info page for an order
            setIngredients(() => ingredientsCheckboxUpdate(ingredients, undefined, false, undefined, objToShow));
    }, [props.ingredients]);

    /* Order form:
     * on the right there is the computed price
     * a radio button to choose the desired size
     * a radio button to choose the desired base
     * checkboxes to choose the ingredients
     * submit/cancel button
    */
    return (
        <Container>
            <h2 className="text-center m-0 p-0">{objToShow ? `Order #${objToShow.id}` : "Place your order!"}</h2>
            <Row className="p-0 mx-0 my-2">
                {/*When the user goes back to the list of orders, we refetch the ingredients and the list of orders
                  * because in the meanwhile somebody could have bought some ingredients with limited quantity
                  * the user could have performed another order from another window
                  */}
                <Col className="col-8 p-0"><Button variant="link" className="fs-5 p-0" onClick={() => {props.setDirty(true); navigate('/orders')}}> &lt; Back</Button></Col>
                <Col className="col-4 p-0 m-0"><p className="text-center border p-0 fs-5">Price € {objToShow ? objToShow.price.toFixed(2) : (computePrice()).toFixed(2)}</p></Col>
            </Row>
            <Form onSubmit={handleSubmit}>
                <Form.Group>
                    <Form.Label label={"dish size"} htmlFor="sizes">{objToShow ? "Chosen size" : "Choose a size"}</Form.Label>
                    <div>
                        {props.sizes.map((e) => (
                            <Form.Check
                                type={'radio'}
                                key={e.size}
                                id={e.size} >
                                <Form.Check.Input type="radio" value={e.size}
                                    name="sizes"
                                    defaultChecked={sizes ? (sizes.find((i) => i.size === e.size).selected) : false}
                                    onChange={(event) => {
                                        // When the size changes, we have to update the size state but also the ingredients one (to prevent from ordering too many ingredients)
                                        setSizes((oldList) => {
                                            return sizeRadioUpdate(oldList, event.target.value, (ingredients.filter((i) => i.selected).length));
                                        });
                                        setIngredients((oldList) => {
                                            return ingredientsCheckboxUpdate(oldList, undefined, false, event.target.value);
                                        });
                                    }}
                                    disabled={sizes ? (sizes.find((i) => i.size === e.size).disabled) : false} />
                                <Form.Check.Label>
                                    {e.size}<Badge bg="danger" text="light" className="ms-3">{sizes ? (sizes.find((s) => s.size === e.size).msg) : ""}</Badge>
                                </Form.Check.Label>
                            </Form.Check>

                        ))}
                    </div>
                </Form.Group>
                <Form.Group className="mt-3">
                    <Form.Label label={"dish base"} htmlFor="bases">{objToShow ? "Chosen base" : "Choose a base"}</Form.Label>
                    <div>
                        {props.bases.map((e) => (

                            <Form.Check
                                type={'radio'}
                                key={e.base}
                                id={e.base}
                                label={e.base}
                                value={e.base}
                                defaultChecked={objToShow ? e.base === objToShow.base : e.base === "pizza"}
                                disabled={objToShow ? e.base !== objToShow.base : false}
                                name="bases"
                                onChange={(event) => setBase(event.target.value)}
                            />
                        ))}
                    </div>
                </Form.Group>
                <Form.Group className="mt-3">
                    <Form.Label label={"dish ingredients"} htmlFor={"ingredients"}>{objToShow ? "Chosen ingredients" : "Choose the ingredients"}</Form.Label>
                    <div>
                        {props.ingredients.map((e) => (
                            <Form.Check
                                type={'checkbox'}
                                key={e.name}
                                id={e.name} >
                                <Form.Check.Input type="checkbox" value={e.name}
                                    name="ingredients"
                                    onChange={(event) => {
                                        if (!objToShow) { // if we are visualizing an old order, any change is prevented
                                            // When the ingredients list changes, we have to update the ingredient state but also the sizes one
                                            // (to prevent from choosing a size with less ingredients then selected)
                                            setSizes((oldList) => {
                                                return sizeRadioUpdate(oldList, sizes.find((s) => s.selected).size, (ingredients.filter((i) => i.selected).length) + (event.target.checked ? 1 : -1));
                                            });
                                            setIngredients((oldList) => {
                                                return ingredientsCheckboxUpdate(oldList, event.target.value, event.target.checked, undefined);
                                            });
                                        }

                                    }}
                                    disabled={ingredients ? (ingredients.find((i) => i.name === e.name).disabled) : false}
                                    checked={(ingredients.find((i) => i.name === e.name).selected)}
                                />
                                <Form.Check.Label>
                                    {e.name}<Badge bg={ingredients ? (ingredients.find((i) => i.name === e.name).variant) : "danger"} text={ingredients ? (ingredients.find((i) => i.name === e.name).variant == "warning" ? "dark" : "light") : "light"} className="ms-3">{ingredients ? (ingredients.find((i) => i.name === e.name).msg) : ""}</Badge>
                                </Form.Check.Label>
                            </Form.Check>
                        ))}
                    </div>
                </Form.Group>
                {objToShow ?
                    <div></div> :
                    <div className='mt-5 text-center'>
                        <Button type="submit" variant="dark" className="mx-2 px-5 fs-5">Confirm</Button>
                        {/*When the user cancels the order, we refetch the ingredients and the list of orders
                            * because in the meanwhile somebody could have bought some ingredients with limited quantity
                            * the user could have performed another order from another window
                        */}
                        <Button variant='light' className="border mx-2 px-5 fs-5" onClick={() => {props.setDirty(true); navigate('/orders')}}>Cancel</Button>
                    </div>
                }
            </Form>
        </Container>

    );

}

export { OrderConfigurator };