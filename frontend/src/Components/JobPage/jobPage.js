import PageHeader from "../Navbar/pageHeader";
import { useState, useEffect, useRef } from "react";
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
    const [isApplying, setIsApplying] = useState(false);
    const fileInputRef = useRef(null);
    
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

    const isRecruiterOwner = user && (user.type === "recruiters" || user.company) && (
        (job.recruiterId && user._id && job.recruiterId.toString() === user._id.toString()) ||
        (user.name && (user.name === job.recruiterName || user.name === job.recruiter))
    );

    const alreadyApplied = user?.applications?.some((app)=> (app.id === id || app.jobId === id));

    const handleApply = async () =>{
        if (alreadyApplied || isApplying) return;

        setIsApplying(true);

        try{
            const res= await fetch("http://localhost:5000/apply", {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({userId:user._id, jobId:id, title:title}),
            });
            const data = await res.json();
            if(res.ok){
                dispatch(addApplication({id, jobId: id, title}));
                alert(data.message || "Application successful!");
            }
            else{
                alert(data.message || "Application failed!");
                setIsApplying(false);
            }
        }
        catch(err){
            alert("Failed to connect to server!");
            setIsApplying(false);
        }
    }

    const handleImageChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert("Image size should be less than 5MB.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Image = reader.result;
            try {
                const res = await fetch(`http://localhost:5000/job/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ jobImage: base64Image, recruiterId: user._id })
                });
                const data = await res.json();
                if (res.ok) {
                    setJob((prev) => ({ ...prev, jobImage: base64Image }));
                    alert("Job image updated successfully!");
                } else {
                    alert(data.message || "Failed to update image");
                }
            } catch (err) {
                console.error(err);
                alert("Failed to connect to server!");
            }
        };
        reader.readAsDataURL(file);
    };

    const displayImage = job.jobImage || office;

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
                    {!isRecruiterOwner && (
                        <button className="Button" onClick={handleApply} disabled={alreadyApplied || isApplying}>
                            {alreadyApplied ? "Applied" : isApplying ? "Applying..." : "Apply now!"}
                        </button>
                    )}
                </div>
                <div className="Right job" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}> 
                    <p className="Right text"> Salary offered: ${salary}/month </p>
                    <img src={displayImage} alt="Job" width="500px" style={{ maxHeight: "300px", objectFit: "cover", borderRadius: "8px" }} />
                    {isRecruiterOwner && (
                        <div style={{ marginTop: "15px" }}>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                accept="image/*" 
                                onChange={handleImageChange} 
                                style={{ display: "none" }} 
                            />
                            <button className="Button" type="button" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                                Change image
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
    )
}

export default JobPage;