import PageHeader from "../Navbar/pageHeader";
import { useState, useEffect } from "react";
import AltProfileDetails from "./altProfileDetails";
import Me from "../../Assets/Images/me.jpg";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import ApplicantIcon from "../../Assets/Images/ApplicantIcon.png";
import ChatIconWhite from "../../Assets/Images/ChatIconWhite.png";

/*USE A USE REFERENCE ON THE LOGIN PAGE TO STORE A REFERENCE TO THE
CURRENT USER. THEN, SIMPLY EXTRACT THE CURRENT USER'S DATA WHENEVER NEEDED
*/
function ViewUser(){
    const dispatch = useDispatch();
    const user = useSelector((state)=>state.user.user);
    const {id} = useParams();
    const [applicant, setApplicant] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(()=>{
        const fetchapplicant = async()=>{
            try{
                const res = await fetch(`http://localhost:5000/applicants/${id}`);
                const data = await res.json();
                if(res.ok){
                    setApplicant(data.data);
                }
            }
            catch(err){
                console.log(err);
            }
            finally{
                setLoading(false);
            }
        }
        fetchapplicant();

    }, [id])
    if(!user) return <Navigate to="/" replace />
    if(loading) return <div className="Backlayer start"> Loading...</div>

    const name=applicant.name;

    return(
    <div className='Backlayer'>
        <PageHeader />
        <h1 className="Pagetitle"> 
            Profile &nbsp;
            <img src={ApplicantIcon} alt="User type" height="50px" />
        </h1>
        
        <div className="Bodysection">
            <div className="Textpartition title">
                {name}
                <img src={ChatIconWhite} alt="Chat!" height="50px"/>
            </div>
            <div className="Textpartition">
                <div className="Left text">
                    <AltProfileDetails />
                </div>
                <div className="Right"> 
                    <img src={Me} alt="Applicant" width="500px"/>
                </div>
            </div>
        </div>
    </div>
    )
}

export default ViewUser;