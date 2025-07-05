import { Table, Button, Row, Col, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router';

// Component representing the table with the list of orders
function OrdersList(props) {
    const navigate = useNavigate();
    return (
        <Container>
            <Row className="p-0 mx-0 my-2">
                <Col className="col-9"><h2>Your orders</h2></Col>
                    {/*When the user goes to the page for the new order, we refetch the ingredients (and the list of orders)
                        * because in the meanwhile somebody could have bought some ingredients with limited quantity
                        * or they could have deleted an order so that an ingredient is again available
                        * the latter is more important because otherwise the ui will prevent us from buying an available product
                        * if, instead, someone ordered the last item while we were ordering the server will return an error and tell us
                    */}
                <Col className="col-3"><Button variant="ligth" className="fs-5 border" onClick={() => {props.setDirty(true); navigate('/orders/new');}}>New</Button></Col>
            </Row>
            {props.orders.length == 0?
            <p>No orders yet.</p>:
            <Table>
                {/* <Table striped bordered hover> */}
                <thead>
                    <tr>
                        <th>Id</th>
                        <th>Date</th>
                        <th>Price</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {/* the key can also be the answer id, if unique */}
                    {props.orders.map((e, index) =>
                        <OrderRow key={index} order={e} deleteOrder={() => props.deleteOrder(e.id)} loggedInTotp={props.loggedInTotp} />)
                    }
                </tbody>
            </Table>}
        </Container>
    )
}

// Component representing the single order (passed as props.order)
function OrderRow(props) {
    const e = props.order;

    let statusClass = null;
    const navigate = useNavigate();

    // Styling for the optimistic update
    switch (e.status) {
        case 'added':
            statusClass = 'table-success';
            break;
        case 'deleted':
            statusClass = 'table-danger';
            break;
        default:
            break;
    }

    // The delete button is disabled if we are not logged in with TOTP
    // The info button allows to show addition information about an order
    return (
        <tr className={statusClass}>
            <td>{e.id}</td>
            <td>{e.date.format("YYYY-MM-DD")}</td>
            <td>{"€ " + e.price.toFixed(2)}</td>
            <td><Button className="mx-1" variant="outline-primary" onClick={() => navigate('/orders/' + props.order.id)}><i className="bi bi-info-lg"></i></Button>
                <Button className="mx-1" variant="outline-danger" onClick={props.deleteOrder} disabled={!props.loggedInTotp}><i className="bi bi-trash"></i></Button></td>
        </tr>
    );
}

export { OrdersList };