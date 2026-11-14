import PageHeader from "../Navbar/pageHeader";
import JobComponent from "./jobComponent";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";
import { toggleMatchPercentage } from "../../redux/userSlice";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function WelcomePageApplicant(){
    const dispatch = useDispatch();
    const user = useSelector((state)=>state.user.user);
    const showMatchPercentage = useSelector((state)=>state.user.showMatchPercentage);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(()=>{
        if(!user) return;
        const fetchjobs = async () => {
            try{
                const res = await fetch(`${API_BASE_URL}/search`, {
                    method:"POST",
                    headers:{"Content-Type":"application/json",},
                    body:JSON.stringify({yoe: user.yoe || 0, applicantId: user._id}),
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

    const displayedJobs = showMatchPercentage
        ? jobs
        : [...jobs].sort((a, b) => (a._id || "").toString().localeCompare((b._id || "").toString()));

    return(
    <div className='Backlayer'>
        <PageHeader />
        <div className="Bodysection">
            <div className="Textpartition title">
                <span>Jobs for you...</span>
                <div 
                    onClick={() => dispatch(toggleMatchPercentage())}
                    style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "12px", 
                        cursor: "pointer",
                        fontSize: "28px",
                        userSelect: "none"
                    }}
                    title="Toggle AI Match Ranking & Score Display"
                >
                    <span>AI Match Ranking</span>
                    <div style={{
                        width: "56px",
                        height: "30px",
                        backgroundColor: showMatchPercentage ? "#2e7d32" : "rgba(255,255,255,0.35)",
                        borderRadius: "15px",
                        position: "relative",
                        transition: "background-color 0.25s ease",
                        border: "2px solid #fff"
                    }}>
                        <div style={{
                            width: "22px",
                            height: "22px",
                            backgroundColor: "#fff",
                            borderRadius: "50%",
                            position: "absolute",
                            top: "2px",
                            left: showMatchPercentage ? "28px" : "2px",
                            transition: "left 0.25s ease",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.3)"
                        }} />
                    </div>
                </div>
            </div>
            {displayedJobs.length===0 && <p>No jobs found matching your parameters!</p>}
            {displayedJobs.map((job)=>(
                <JobComponent key={job._id}
                id={job._id}
                title={job.title}
                company={job.company}
                recruiterName={job.recruiterName}
                recruiter={job.recruiter}
                yoeNeeded={job.yoeNeeded}
                salary={job.salary}
                benefits={job.benefits || []}
                jobImage={job.jobImage}
                matchPercentage={job.matchPercentage}
                matchBreakdown={job.matchBreakdown}
                hasApplied={job.hasApplied}
                applicationStatus={job.applicationStatus} />
            ))}
        </div>
    </div>
    )
}

export default WelcomePageApplicant;