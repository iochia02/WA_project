import { Form, Button, Alert, Container, Row, Col } from 'react-bootstrap';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import API from '../API';

// Component with the TOTP form
function TotpForm(props) {
  const [totpCode, setTotpCode] = useState(''); // State representing the TOTP

  const navigate = useNavigate();

// Send the request to the server for the TOTP verification
  const doTotpVerify = () => {
    API.totpVerify(totpCode)
      .then( () => {
        props.setErrorMessage('');
        props.totpSuccessful();
        navigate('/orders');
      })
      .catch( () => {
        // NB: Generic error message
        props.setErrorMessage('Wrong code, please try again');
      })
  }

  const handleSubmit = (event) => {
      event.preventDefault();
      props.setErrorMessage('');

      // Some validation
      let valid = true;
      if (totpCode === '' || totpCode.length !== 6)
          valid = false;

      if (valid) {
        doTotpVerify();
      } else {
        props.setErrorMessage('Invalid content in form: either empty or not 6-char long');
      }
  };

  // If we click skip, the user doesn't perform the second factor applicaton
  return (
      <Container>
          <Row>
              <Col xs={3}></Col>
              <Col xs={6}>
                  <h2>Second Factor Authentication</h2>
                  <h5>Please enter the code that you read on your device</h5>
                  <Form onSubmit={handleSubmit}>
                      <Form.Group controlId='totpCode'>
                          <Form.Label>Code</Form.Label>
                          <Form.Control type='text' value={totpCode} onChange={ev => setTotpCode(ev.target.value)} />
                      </Form.Group>
                      <Button className='my-2' type='submit' variant='dark'>Validate</Button>
                      <Button className='my-2 mx-2 border' variant='light' onClick={()=>navigate('/orders')}>Skip</Button>
                  </Form>
              </Col>
              <Col xs={3}></Col>
          </Row>
      </Container>
    )

}

// Component with the login form
function LoginForm(props) {
  const [username, setUsername] = useState(""); // State with the typed username
  const [password, setPassword] = useState("");  // State with the typed password

  const navigate = useNavigate();

  // Send the login request to the server
  const doLogIn = (credentials) => {
    API.logIn(credentials)
      .then( user => {
        props.setErrorMessage('');
        props.loginSuccessful(user);
      })
      .catch(err => {
        // Generic error message, not to give additional info (e.g., if user exists etc.)
        props.setErrorMessage('Wrong username or password');
      })
  }

  const handleSubmit = (event) => {
      event.preventDefault();
      props.setErrorMessage('');
      const credentials = { username, password };

      let valid = true;
      if(username === '' || password === '')
          valid = false;

      if(valid)
      {
        doLogIn(credentials);
      } else {
        props.setErrorMessage('Invalid content in form.')
      }
  };

  return (
      <Container>
          <Row>
              <Col xs={3}></Col>
              <Col xs={6}>
                  <h2>Login</h2>
                  <Form onSubmit={handleSubmit}>
                      <Form.Group controlId='username'>
                          <Form.Label>Email</Form.Label>
                          <Form.Control type='email' value={username} onChange={ev => setUsername(ev.target.value)} />
                      </Form.Group>
                      <Form.Group controlId='password'>
                          <Form.Label>Password</Form.Label>
                          <Form.Control type='password' value={password} onChange={ev => setPassword(ev.target.value)} />
                      </Form.Group>
                      <Button className='my-2' type='submit' variant='dark'>Login</Button>
                      <Button className='my-2 mx-2 border' variant='light' onClick={()=>navigate('/')}>Cancel</Button>
                  </Form>
              </Col>
              <Col xs={3}></Col>
          </Row>
      </Container>
    )
}

export { LoginForm, TotpForm };
