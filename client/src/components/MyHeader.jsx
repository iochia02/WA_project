import { Navbar, Nav, Button } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router';

function MyHeader(props) {
    const navigate = useNavigate();
    const name = props.user && props.user.name; // if the user is logged in, retrieve the name

    // When logging in, hide the login/logout button
    const loggingIn = useLocation().pathname === "/login"
    let loginButton;
    if (!loggingIn) {
        if (name) {
            loginButton = <Button className="bi bi-box-arrow-right py-0 px-3 mx-2" variant="dark" onClick={props.logout} />;
        } else {
            loginButton = <Button className="bi bi-person  py-0 px-3 mx-2" variant="dark" onClick={() => navigate("/login")} />;
        }
    }
    /* Header containing:
     * the app name
     * the name of the logged in user (if logged in)
     * the button to login/logout
    */
    return (
        <Navbar bg="dark" variant="dark" className="d-flex justify-content-between">
            <Navbar.Brand className="mx-2">
                <i className="bi bi-fork-knife px-3" />
                Pick<span id="and">&</span>Eat
            </Navbar.Brand>
            {name && !loggingIn ? <Navbar.Text className='fs-5'>
                {`Welcome back ${props.user.name}! ${props.loggedInTotp ? '(2FA)' : ''}`}
            </Navbar.Text> : <Navbar.Text />}
            <Nav.Link> {!loggingIn ? loginButton : ""} </Nav.Link>
        </Navbar>
    );
}

export { MyHeader };