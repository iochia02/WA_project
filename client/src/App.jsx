import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useEffect, useState } from 'react';
import { Col, Container, Row, Spinner, Alert } from 'react-bootstrap';
import { Routes, Route, Outlet, Link, Navigate, useNavigate } from 'react-router';
import './App.css';

import { MyHeader } from './components/MyHeader.jsx';
import { MyFooter } from './components/MyFooter.jsx';
import { MenuOptions } from './components/MenuOptions.jsx';
import { OrderConfigurator } from './components/OrderConfigurator.jsx'
import { OrdersList } from './components/OrdersList.jsx'

import API from './API.js';
import { LoginForm, TotpForm } from './components/AuthComponent.jsx';

function App() {
  const [bases, setBases] = useState([]); // State containing the bases list
  const [sizes, setSizes] = useState([]); // State containing the sizes list
  const [ingredients, setIngredients] = useState([]); // State containing the ingredients list
  const [orders, setOrders] = useState([]); // State containing the orders list

  const [dirty, setDirty] = useState(false); // State to know when refetching from the server
  const [waiting, setWaiting] = useState(true); // State to know whether we are waiting data from the server

  const [errorMsg, setErrorMsg] = useState(''); // State to show the error messages

  const [user, setUser] = useState(undefined); // State containing the user info
  const [loggedIn, setLoggedIn] = useState(false); // State to know whether the user is logged in or not
  const [loggedInTotp, setLoggedInTotp] = useState(false); // State to know whether the user is logged in with TOTP or not

  const navigate = useNavigate();

  // Show error messages
  function handleError(err) {
    console.log('handleError: ', err);
    let errMsg = 'Unkwnown error';
    if (err.errors) {
      if (err.errors[0].msg) {
        errMsg = err.errors[0].msg;
      }
    } else {
      if (err.error) {
        errMsg = err.error;
      }
    }
    setErrorMsg(errMsg);

    if (errMsg === 'Not authenticated')
      setTimeout(() => {  // do logout in the app state
        // the ingredients list will be reloaded since LoggedIn is changing, orders must be reset (no more authenticated)
        setUser(undefined); setLoggedIn(false); setOrders([]);
      }, 2000);
    else
      setTimeout(() => setDirty(true), 2000);  // Fetch the current version from server, after a while
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // here you have the user info, if already logged in
        const user = await API.getUserInfo();
        setLoggedIn(true);
        setUser(user);
        if (user.isTotp)
          setLoggedInTotp(true);
      } catch (err) {
        // NO need to do anything: user is simply not yet authenticated
      }
    };
    checkAuth();
  }, []);

  // At mount time, retrieve the bases, sizes and ingredients from the server
  useEffect(() => {
    Promise.all([API.getBases(), API.getSizes(), API.getIngredients()])
      .then((values) => {
        setBases(values[0]);
        setSizes(values[1]);
        setIngredients(values[2]);
        setWaiting(false);
      })
      .catch((err) => handleError(err));
  }, [loggedIn]);


  // When the user logs in, retrieve the orders
  useEffect(() => {
    if (loggedIn) {
      setWaiting(true);
      API.getOrders()
      .then((orders) => {
        setOrders(orders);
        setWaiting(false);
    })
      .catch((err) => handleError(err));
    }
  }, [loggedIn]);

  // When dirty is set, reload the ingredients (quantities may have changed) and the orders
  // Dirty is set only if we added/deleted an order or in something went wrong while the user was authenticated
  useEffect( ()=> {
    if (dirty)
      Promise.all([API.getIngredients(), API.getOrders()])
      .then((values) => {
        setIngredients(values[0]);
        setOrders(values[1]);
        setDirty(false);
      })
      .catch((err) => handleError(err));
  }, [dirty]); // run time

  // Delete the order implemented the optimistic update
  function deleteOrder(id) {
    setOrders(orders =>
      orders.map(e => e.id === id ? {...e, status: 'deleted' } : e)
    );
    API.deleteOrder(id)
      .then(() => setDirty(true))
      .catch((err) => handleError(err));
  }

  // Add the new order
  // The server return the added order, so we can update the list of orders before refetching it (optimistic update)
  // Only if the request was successful we go back to the list of orders, otherwise we remain on the configurators page
  function addOrder(order) {
    API.addOrder(order)
      .then((newOrder) => {setOrders([...orders, newOrder]); setDirty(true); navigate('/orders');})
      .catch((err) => {handleError(err);});
  }

  // Do log out and forget the orders of that user (reset the orders state)
  const doLogOut = async () => {
    await API.logOut();
    setLoggedIn(false);
    setUser(undefined);
    setLoggedInTotp(false);
    setOrders([]);
  }

  // Perform the login
  const loginSuccessful = (user) => {
    setUser(user);
    setLoggedIn(true);
  }

  /*
   * Set the spinner if we are waiting data from the server (at the beginning)
   * If the user is not logged in, we re-route them to '/' (with the list of ingredients)
   * If the user is logged in, we split the view, so they can always see the list of ingredients
   * '/'       -> the list of orders
   * '/new'    -> the form for the new order
   * ':id'     -> order #id info
   * '/login' -> login form
   * Basic responsiveness is implemented
  */
  return (
    <Routes>
      <Route path='/' element={<Layout user={user} loggedIn={loggedIn} logout={doLogOut} loggedInTotp={loggedInTotp} errorMsg={errorMsg} setErrorMsg={setErrorMsg}/>}>
        <Route index element={ waiting ?
        <Row><Col><Spinner /></Col></Row>
        : loggedIn? <Navigate replace to='/orders' />: <MenuOptions bases={bases} sizes={sizes} ingredients={ingredients}/>} />
        <Route path='/orders' element={ waiting ?
        <Row><Col><Spinner /></Col></Row>
        : loggedIn? <Row>
            <Col className="border-end pt-1 col-12 col-lg-6"><MenuOptions bases={bases} sizes={sizes} ingredients={ingredients} /></Col>
            <Col className="ps-3 pe-0 col-12 col-lg-6 "><OrdersList orders={orders} deleteOrder={deleteOrder} loggedInTotp={loggedInTotp} setDirty={setDirty}/></Col>
          </Row>: <Navigate replace to='/' />}/>
        <Route path='orders/new' element={
          loggedIn?
          <Row>
            <Col className="border-end pt-1 col-12 col-lg-6"><MenuOptions bases={bases} sizes={sizes} ingredients={ingredients} /></Col>
            <Col className="ps-3 pe-0 col-12 col-lg-6 "><OrderConfigurator bases={bases} sizes={sizes} ingredients={ingredients} addOrder={addOrder} setDirty={setDirty}/></Col>
          </Row>:<Navigate replace to='/' />
        } />
        <Route path='/orders/:orderId' element={
          loggedIn?
          <Row>
            <Col className="border-end pt-1 col-12 col-lg-6"><MenuOptions bases={bases} sizes={sizes} ingredients={ingredients} /></Col>
            <Col className="ps-3 pe-0 col-12 col-lg-6 "><OrderConfigurator bases={bases} sizes={sizes} ingredients={ingredients} orders={orders} setDirty={setDirty}/></Col>
          </Row>:<Navigate replace to='/' />
        }/>
        <Route path='/login' element={
        <LoginWithTotp loginSuccessful={loginSuccessful} loggedIn={loggedIn} user={user}
          loggedInTotp={loggedInTotp} setLoggedInTotp={setLoggedInTotp} errorMessage={errorMsg} setErrorMessage={setErrorMsg}/>} />
        <Route path='/*' element={<DefaultRoute />} />
      </Route>
    </Routes>
  );
}

// Routing to perform TOTP
function LoginWithTotp(props) {
if (props.loggedIn) {
      if (props.loggedInTotp) { // everything is fine, go to /orders
        return <Navigate replace to='/orders' />;
      } else { // do the TOTP
        return <TotpForm totpSuccessful={() => props.setLoggedInTotp(true)} errorMessage={props.errorMessage} setErrorMessage={props.setErrorMessage} />;
      }
    } else { // you didn't authenticate yet, go to /login
    return <LoginForm loginSuccessful={props.loginSuccessful} errorMessage={props.errorMessage} setErrorMessage={props.setErrorMessage}/>;
  }
}


function Layout(props) {
  /* Page structure
   * Header
   * Error alerts (if present)
   * Layout
   * Footer
  */
  return (
    <Container fluid className="m-0 p-0 d-flex flex-column min-vh-100">
      <Row className="mb-3">
        <Col className="m-0 p-0">
          <MyHeader user={props.user} loggedIn={props.loggedIn} logout={props.logout} loggedInTotp={props.loggedInTotp} />
        </Col>
      </Row>
          {props.errorMsg? <Row><Col><Alert className="m-2"
      variant="danger" dismissible onClose={()=>props.setErrorMsg('')} >
      {props.errorMsg}</Alert></Col></Row>: null}
      <Outlet />
      <Row className="mt-auto text-center">
        <Col className="ms-2 p-0 me-0">
          <MyFooter />
        </Col>
      </Row>
    </Container>
  )
}

// Page shown if no other route matches
function DefaultRoute(props) {
  return (
    <Container fluid>
      <p className="my-2">No data here: This is not a valid page!</p>
      <Link to='/'>Please go back to main page</Link>
    </Container>
  );
}


export default App
