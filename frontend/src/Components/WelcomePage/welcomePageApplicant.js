import PageHeader from "../Navbar/pageHeader";
import JobComponent from "./jobComponent";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

/*USE A USE REFERENCE ON THE LOGIN PAGE TO STORE A REFERENCE TO THE
CURRENT USER. THEN, SIMPLY EXTRACT THE CURRENT USER'S DATA WHENEVER NEEDED
*/
function WelcomePageApplicant(){
    const user = useSelector((state)=>state.user.user);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(()=>{
        if(!user) return;
        const fetchjobs = async () => {
            try{
                const res = await fetch("http://localhost:5000/search", {
                    method:"POST",
                    headers:{"Content-Type":"application/json",},
                    body:JSON.stringify({yoe: user.yoe || 0}),
                });
                const jobsData = await res.json();
                if(res.ok){
                    setJobs(jobsData.data || []);
                }
                else{
                    alert(jobsData.message || "Failed to load jobs");
                }
            }
            catch(err){
                console.log(err);
            }
            finally{
                setLoading(false);
            }
        }

        fetchjobs();
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
                Jobs for you...
            </div>
            {jobs.length===0 && <p>No jobs found matching your parameters!</p>}
            {jobs.map((job)=>(
                <JobComponent key={job._id}
                id={job._id}
                title={job.title}
                company={job.company}
                recruiterName={job.recruiterName}
                recruiter={job.recruiter}
                yoeNeeded={job.yoeNeeded}
                salary={job.salary}
                benefits={job.benefits || []} />
            ))}
        </div>
    </div>
    )
}

export default WelcomePageApplicant;