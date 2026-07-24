import PageHeader from "../Navbar/pageHeader";
import { useState, useEffect } from "react";
import JobDetails from "./jobDetails";
import office from "../../Assets/Images/office.jpeg";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addApplication } from "../../redux/userSlice";
import { Navigate } from "react-router-dom";


function JobPage(){
    const dispatch = useDispatch();
    const user = useSelector((state)=>state.user.user);
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
    if(!user) return <Navigate to="/" replace />
    if(loading) return <div className="Backlayer start"> Loading...</div>
    if(!job) return <div className="Backlayer start"> Job details not found</div>

    const title=job.title || "Job Title";
    const company=job.company || "Company";
    const salary=job.salary || 0;

    const alreadyApplied = user?.applications?.some((app)=> (app.id === id || app.jobId === id));

    const handleApply = async () =>{
        try{
            const res= await fetch("http://localhost:5000/apply", {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({userId:user._id, jobId:id, title:title}),
            });
            const data = await res.json();
            if(res.ok){
                dispatch(addApplication({id, jobId: id, title}));
                alert("Application successful!");
            }
            else{
                alert("Application failed!");
            }
        }
        catch(err){
            alert("Failed to access database!");
        }
    }

    return(
    <div className='Backlayer'>
        <PageHeader />
        <h1 className="Pagetitle"> 
            {title} &nbsp;
        </h1>
        
        <div className="Bodysection">
            <div className="Textpartition title">
                {company}
            </div>
            <div className="Textpartition">
                <div className="Left text">
                    <JobDetails />
                    <button className="Button" onClick={handleApply} disabled={alreadyApplied}> {alreadyApplied? "Applied" : "Apply now!"} </button>
                </div>
                <div className="Right job"> 
                    <p className="Right text"> Salary offered: ${salary}/month </p>
                    <img src={office} alt="Applicant" width="500px"/>
                </div>
            </div>
        </div>
    </div>
    )
}

export default JobPage;