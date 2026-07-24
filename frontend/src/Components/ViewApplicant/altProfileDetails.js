import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { useParams } from "react-router-dom";

function AltProfileDetails(){
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


    if(!applicant) return <div className="Backlayer start"> No applicant details found</div>

    const name = applicant.name || "";
    const email = applicant.email || "";
    const age = applicant.age || "";
    const yoe = applicant.yoe || 0;
    const tenth_school = applicant.tenth_school || "";
    const tenth_result = applicant.tenth_result || "";
    const twelfth_school = applicant.twelfth_school || "";
    const twelfth_result = applicant.twelfth_result || "";
    const bachelors_course = applicant.bachelors_course || "";
    const bachelors_school = applicant.bachelors_school || "";
    const bachelors_result = applicant.bachelors_result || "";
    const work = applicant.work || [];
    const projects = applicant.projects || [];
    const applications = applicant.applications || [];

    return(
        <div>
            <div>
                Age: {age} <br /> <br />
                Years of Experience: {yoe}+ <br /> <br />
                Education: <br />
                10th- {tenth_school}, {tenth_result} <br />
                12th- {twelfth_school}, {twelfth_result} <br />
                Bachelor's- {bachelors_course} <br /> 
                {bachelors_school}, {bachelors_result} <br />
                <br />
            </div>
            <div>
                Work Experience-
                <ul>
                    {work.map((job, idx) => (
                        <li key={job.company || job.name || idx}> {(job.company || job.name)} - {job.description} </li>
                    ))}
                </ul>
                Projects-
                <ul>
                    {projects.map((project, idx) => (
                        <li key={project.name || project.title || idx}> {(project.name || project.title)} - {project.description} </li>
                    ))}
                </ul>
                My Applications:
                <ul>
                    {applications.map((application, idx) =>(
                        <li key={application.id || application.jobId || idx}> {application.title} </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

export default AltProfileDetails;