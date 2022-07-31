import {Col, Container, Row} from "react-bootstrap";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css"
import meter1 from '../assets/img/meter1.svg'
import meter2 from '../assets/img/meter2.svg'
import meter3 from '../assets/img/meter3.svg'
import meter4 from '../assets/img/meter1.svg'
import meter5 from '../assets/img/meter2.svg'
import colorSharp from  '../assets/img/color-sharp.png'

export const Skills=()=>{
    const responsive={
        superLargeDesktop:{
            breakpoint: {max:4000,min:3000},
            items:5
        },
        desktop: {
            breakpoint: {max: 3000,min: 1024},
            items: 3
        },
        tablet: {
            breakpoint: {max:1024,min:464},
            items:2
        },
        mobile: {
            breakpoint: { max: 464,min:0},
            items:1
        }
    }
    return (
        <section className="skill">
            <Container>
                <Row>
                    <Col>
                        <div className="skill-bx">
                            <h2>Skills</h2>
                            <p>
                                Full Stack Developer with 3+ years of hands-on experience designing, developing, and implementing applications and solutions using a range
                                of technologies and PHP programming languages. I seek to leverage broad development experience and hands-on technical expertise in a
                                challenging role as a Full-stack Developer.
                            </p>
                            <Carousel className="skill-slider" responsive={responsive} infinite={true}>
                                <div className="item">
                                    <img src={meter1} alt="Image"/>
                                    <h5>Web Developer</h5>
                                </div>
                                <div className="item">
                                    <img src={meter2} alt="Image"/>
                                    <h5>Web Designer</h5>
                                </div>
                                <div className="item">
                                    <img src={meter3} alt="Image"/>
                                    <h5>UI/UX Designer</h5>
                                </div>
                                <div className="item">
                                    <img src={meter4} alt="Image"/>
                                    <h5>PHP</h5>
                                </div>
                                <div className="item">
                                    <img src={meter5} alt="Image"/>
                                    <h5>Laravel</h5>
                                </div>
                            </Carousel>
                        </div>
                    </Col>
                </Row>
            </Container>
            <img src={colorSharp} className="background-image-left"/>
        </section>
    )
}