import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { clearUser } from "../../redux/userSlice";

function RecruiterDetails(){
    const dispatch = useDispatch();
    const user = useSelector((state)=>state.user.user);
    const navigate = useNavigate();

    const [postedJobs, setPostedJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    const email = user?.email || "";

    useEffect(() => {
        const fetchRecruiterJobs = async () => {
            if (!user?._id) {
                setLoading(false);
                return;
            }
            try {
                const res = await fetch(`http://localhost:5000/job/recruiter/${user._id}`);
                const data = await res.json();
                if (res.ok && data.data && data.data.length > 0) {
                    setPostedJobs(data.data);
                } else if (user?.positions && user.positions.length > 0) {
                    setPostedJobs(user.positions);
                }
            } catch (err) {
                console.error("Error fetching recruiter jobs:", err);
                if (user?.positions) {
                    setPostedJobs(user.positions);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchRecruiterJobs();
    }, [user]);

    const handleDeleteJob = async (jobId) => {
        if (!window.confirm("Are you sure you want to delete this job posting?")) {
            return;
        }

        try {
            const res = await fetch(`http://localhost:5000/job/${jobId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recruiterId: user?._id }),
            });

            const data = await res.json();
            if (res.ok) {
                alert("Job posting deleted successfully!");
                setPostedJobs((prev) => prev.filter((j) => j._id !== jobId));
            } else {
                alert(data.message || "Failed to delete job posting");
            }
        } catch (err) {
            console.error("Error deleting job:", err);
            alert("Error deleting job posting");
        }
    };

    const handleDeleteProfile = async () => {
        if (!user?._id) return;

        if (postedJobs && postedJobs.length > 0) {
            return alert(`Cannot delete profile: You still have ${postedJobs.length} active job posting(s). Please delete all your job listings first.`);
        }

        if (!window.confirm("Are you sure you want to delete your placement cell profile? This action cannot be undone.")) {
            return;
        }

        try {
            const res = await fetch(`http://localhost:5000/recruiters/${user._id}`, {
                method: "DELETE",
            });

            const data = await res.json();
            if (res.ok) {
                alert("Your placement cell profile has been deleted.");
                dispatch(clearUser());
                navigate("/");
            } else {
                alert(data.message || "Failed to delete placement cell profile.");
            }
        } catch (err) {
            console.error("Error deleting profile:", err);
            alert("Error deleting profile.");
        }
    };

    return(
        <div>
            <div>
                Email: {email} <br /> <br />
            </div>
            <div>
                Recruiting for ({postedJobs.length} Position{postedJobs.length === 1 ? "" : "s"})-
                {loading ? (
                    <p>Loading posted jobs...</p>
                ) : postedJobs.length === 0 ? (
                    <p style={{ fontStyle: "italic", color: "#666" }}>No jobs posted yet.</p>
                ) : (
                    <ul style={{ listStyleType: "disc", paddingLeft: "20px" }}>
                        {postedJobs.map((job, idx) => (
                            <li 
                                key={job._id || job.title || job.jtitle || idx}
                                style={{ margin: "14px 0" }}
                            >
                                <span 
                                    style={job._id ? { cursor: "pointer", textDecoration: "underline" } : {}}
                                    onClick={() => job._id && navigate(`/job/${job._id}`)}
                                >
                                    <strong>{job.title || job.jtitle}</strong> — ${job.salary}/mo (YoE Needed: {job.yoeNeeded || 0}+)
                                </span>
                                &nbsp;&nbsp;&nbsp;&nbsp;
                                {user?.type === "recruiters" && (
                                    <button 
                                        className="Button" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (job._id) {
                                                handleDeleteJob(job._id);
                                            } else {
                                                alert("Job posting ID missing.");
                                            }
                                        }}
                                    >
                                        Delete Job
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {user?.type === "recruiters" && (
                <div style={{ marginTop: "25px", display: "flex", flexDirection: "column", gap: "15px", alignItems: "flex-start" }}>
                    <button className="Button" onClick={() => navigate("/addjob")}> 
                        Add new job 
                    </button>
                    <button 
                        className="Button" 
                        onClick={handleDeleteProfile} 
                        style={{ width: "220px" }}
                    > 
                        Delete Profile 
                    </button>
                </div>
            )}
        </div>
    )
}

export default RecruiterDetails;