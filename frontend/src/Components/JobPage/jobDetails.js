import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

function JobDetails(){
    const {id} = useParams();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(()=>{
        const fetchjob = async()=>{
            try{
                const res = await fetch(`http://localhost:5000/job/${id}`);
                const data = await res.json();
                if(res.ok){
                    setJob(data.data);
                }
            }
            catch(err){
                console.log(err);
            }
            finally{
                setLoading(false);
            }
        }
        fetchjob();

    }, [id])

    if(loading) return <div className="Backlayer start"> Loading...</div>
    if(!job) return <div className="Backlayer start"> No details found</div>

    const benefits = job.benefits || [];
    const skillsNeeded = job.skillsNeeded || [];
    const recruiterName = job.recruiterName || job.recruiter || "Jobbing";

    return(
        <div>
            <div>
                Posted by Recruiter: {recruiterName} <br /> <br />
                Years of Experience needed: {job.yoeNeeded || 0}+ <br /> <br />
                Job description: <br />
                {job.description || "No description provided."}
                <br /> <br />
            </div>
            <div>
                Benefits offered-
                <ul>
                    {benefits.map((benefit, idx) => (
                        <li key={benefit || idx}> {benefit} </li>
                    ))}
                </ul>
                Skills needed-
                <ul>
                    {skillsNeeded.map((skill, idx) => (
                        <li key={skill || idx}> {skill} </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

export default JobDetails;