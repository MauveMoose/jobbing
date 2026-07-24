import PageHeader from "../Navbar/pageHeader";
import UserComponent from "./userComponent";
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";


function WelcomePageRecruiter(){
     const user = useSelector((state)=>state.user.user);
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(()=>{
        const fetchapplicants = async () => {
            try{
                const res = await fetch("http://localhost:5000/findusers");
                const applicants = await res.json();
                if(res.ok){
                    setApplicants(applicants.data);
                }
                else{
                    alert(applicants.message);
                }
            }
            catch(err){
                console.log(err);
            }
            finally{
                setLoading(false);
            }
        }

        fetchapplicants();
    }, [user]);

    if(!user){
        return <Navigate to="/" replace />
    }

    if(loading){
        return (
        <div className="Backlayer start"> Loading jobs</div>
        )
    }

    return(
    <div className='Backlayer'>
        <PageHeader />
        <div className="Bodysection">
            <div className="Textpartition title">
                Applicants you might like...
            </div>
            {applicants.length===0 && <p>No applicants found matching your parameters!</p>}
            {applicants.map((applicant)=>(
                <UserComponent key={applicant._id}
                id={applicant._id}
                name={applicant.name}
                age={applicant.age}
                yoe={applicant.yoe}
                work={applicant.work}/>
            ))}
        </div>
    </div>
    )
}

export default WelcomePageRecruiter;