import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { Row, Col, Accordion, ListGroup, Container, Card, CardGroup } from 'react-bootstrap';

// Component to show the option offered by the restaurant in terms of sizes, bases and ingredients
function MenuOptions(props) {
  return (
    <Container className="ps-2">
      <h2 className="text-center">Create your own dish!</h2>
      <h3>Sizes</h3>
      <SizesCards sizes={props.sizes} />
      <h3>Bases</h3>
      <BasesList bases={props.bases} />
      <h3>Ingredients</h3>
      <IngredientsAccordion ingredients={props.ingredients} />
    </Container>
  );
}

// Component wrapping the cards used to show the size list
function SizesCards(props) {
  return (
    <CardGroup className="d-flex justify-content-between p-0 mt-2 mb-4">
      <Row>
        {props.sizes.map((e) =>
          <Col key={"col" + e.size} className="col-12 col-md-4 p-2">
            <SizeCard key={e.size} size={e} /></Col>)}
      </Row>
    </CardGroup>
  )
}

// Card related to each size (passed in props.size)
// It shows all the info about each size (size, price, maxIngredients)
function SizeCard(props) {
  const e = props.size;
  return (
    <Card className="p-0 border">
      <Card.Body>
        <Card.Title>{e.size}</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">{"Price: €" + e.price}</Card.Subtitle>
        <Card.Text>
          You can choose up to {e.maxIngredients} ingredients to customize your dish.
        </Card.Text>
      </Card.Body>
    </Card>
  )
}

// Component showing the list of bases (just characterized by their names)
function BasesList(props) {
  return (
    <ListGroup className="mb-4">
      {props.bases.map((e) =>
        <ListGroup.Item key={e.base}>{e.base}</ListGroup.Item>)}
    </ListGroup>
  );
}

// Component wrapping the AccordionItems to show the ingredients
function IngredientsAccordion(props) {
  return (
    <Accordion defaultActiveKey="0" className="mb-4" alwaysOpen>
      {props.ingredients.map((e, index) =>
        <IngredientAccordionItem key={e.name} eventKey={index} ingredient={e} />)}
    </Accordion>
  )
}

// Component showing one ingredient
// The Accordion title is the ingredient name
// Clicking on the Accordion we see the quantity, cost, required ingredients and incompatibilities list of that ingredient
function IngredientAccordionItem(props) {
  const e = props.ingredient;
  return (
    <Accordion.Item eventKey={props.eventKey} >
      <Accordion.Header className="textAccordion">{e.name}</Accordion.Header>
      <Accordion.Body>
        <ListGroup>
          <ListGroup.Item className="list-accordion-body"><i className="bi bi-handbag-fill px-2"></i>Price: {"€ " + e.price.toFixed(2)}</ListGroup.Item>
          <ListGroup.Item className="list-accordion-body"><i className="bi bi-stack px-2"></i>Quantity: {e.quantity != null ? e.quantity : <i className="bi bi-infinity"></i>}</ListGroup.Item>
          <ListGroup.Item className="list-accordion-body"><i className="bi bi-pin-angle-fill px-2"></i>Requires: {e.requires ? e.requires : "none"}</ListGroup.Item>
          <ListGroup.Item className="list-accordion-body"><i className="bi bi-heartbreak-fill px-2"></i>Incompatibilities: {e.incompatibilities.length > 0 ? e.incompatibilities.join(", ") : "none"}</ListGroup.Item>
        </ListGroup>
      </Accordion.Body>
    </Accordion.Item>
  )
}

export { MenuOptions };