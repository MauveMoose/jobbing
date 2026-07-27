import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";
import { setUser } from "../../redux/userSlice";

function ProfileDetails(){
    const dispatch = useDispatch();
    const user = useSelector((state)=>state.user.user);

    const age = user?.age || 0;
    const yoe = user?.yoe || 0;
    const tenth_school = user?.tenth_school || "N/A";
    const tenth_result = user?.tenth_result || "N/A";
    const twelfth_school = user?.twelfth_school || "N/A";
    const twelfth_result = user?.twelfth_result || "N/A";
    const bachelors_course = user?.bachelors_course || "";
    const bachelors_school = user?.bachelors_school || "";
    const bachelors_result = user?.bachelors_result || "";
    const work = user?.work || [];
    const projects = user?.projects || [];
    const applications = user?.applications || [];

    // Edit states
    const [isEditingAgeYoe, setIsEditingAgeYoe] = useState(false);
    const [editAge, setEditAge] = useState(age);
    const [editYoe, setEditYoe] = useState(yoe);

    const [isAddingWork, setIsAddingWork] = useState(false);
    const [newWorkCompany, setNewWorkCompany] = useState("");
    const [newWorkDesc, setNewWorkDesc] = useState("");

    const [isAddingProject, setIsAddingProject] = useState(false);
    const [newProjectTitle, setNewProjectTitle] = useState("");
    const [newProjectDesc, setNewProjectDesc] = useState("");

    if(!user) return <Navigate to="/" replace />   

    const updateProfile = async (updatedData) => {
        try {
            const res = await fetch(`http://localhost:5000/applicants/${user._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedData),
            });
            const data = await res.json();
            if (res.ok && data.user) {
                dispatch(setUser(data.user));
                alert("Profile updated successfully!");
                return true;
            } else {
                alert(data.message || "Failed to update profile.");
                return false;
            }
        } catch (err) {
            console.error("Error updating profile:", err);
            alert("Error updating profile.");
            return false;
        }
    };

    const handleSaveAgeYoe = async () => {
        const ageNum = Number(editAge);
        const yoeNum = Number(editYoe);

        if (isNaN(ageNum) || ageNum < 18) {
            return alert("Age must be 18 or higher.");
        }
        if (isNaN(yoeNum) || yoeNum < 0) {
            return alert("Years of Experience must be 0 or higher.");
        }
        if (yoeNum > ageNum) {
            return alert("Years of Experience cannot be greater than Age.");
        }

        const success = await updateProfile({ age: ageNum, yoe: yoeNum });
        if (success) {
            setIsEditingAgeYoe(false);
        }
    };

    const handleSaveWork = async () => {
        if (!newWorkCompany.trim()) {
            return alert("Company name is required.");
        }
        const updatedWork = [...work, { company: newWorkCompany.trim(), description: newWorkDesc.trim() }];
        const success = await updateProfile({ work: updatedWork });
        if (success) {
            setNewWorkCompany("");
            setNewWorkDesc("");
            setIsAddingWork(false);
        }
    };

    const handleRemoveWork = async (indexToRemove) => {
        if (!window.confirm("Remove this work experience entry?")) return;
        const updatedWork = work.filter((_, idx) => idx !== indexToRemove);
        await updateProfile({ work: updatedWork });
    };

    const handleSaveProject = async () => {
        if (!newProjectTitle.trim()) {
            return alert("Project title is required.");
        }
        const updatedProjects = [...projects, { name: newProjectTitle.trim(), description: newProjectDesc.trim() }];
        const success = await updateProfile({ projects: updatedProjects });
        if (success) {
            setNewProjectTitle("");
            setNewProjectDesc("");
            setIsAddingProject(false);
        }
    };

    const handleRemoveProject = async (indexToRemove) => {
        if (!window.confirm("Remove this project entry?")) return;
        const updatedProjects = projects.filter((_, idx) => idx !== indexToRemove);
        await updateProfile({ projects: updatedProjects });
    };

    return(
        <div>
            <div>
                {!isEditingAgeYoe ? (
                    <div>
                        Age: {age} <br />
                        Years of Experience: {yoe}+ <br /> <br />
                        <button className="Button" style={{ width: "220px", marginBottom: "30px" }} onClick={() => { setEditAge(age); setEditYoe(yoe); setIsEditingAgeYoe(true); }}>
                            Edit Age & YoE
                        </button>
                        <br />
                    </div>
                ) : (
                    <div style={{ marginBottom: "30px", padding: "15px", backgroundColor: "#A6927E", borderRadius: "8px" }}>
                        Age: <input type="number" value={editAge} onChange={(e) => setEditAge(e.target.value)} style={{ width: "100px", height: "35px", fontSize: "24px" }} /> <br /><br />
                        Years of Experience: <input type="number" value={editYoe} onChange={(e) => setEditYoe(e.target.value)} style={{ width: "100px", height: "35px", fontSize: "24px" }} /> <br /><br />
                        <button className="Button" style={{ width: "180px" }} onClick={handleSaveAgeYoe}> Save Age & YoE </button> &nbsp;
                        <button className="Button" style={{ width: "120px" }} onClick={() => setIsEditingAgeYoe(false)}> Cancel </button>
                    </div>
                )}

                Education: <br />
                10th- {tenth_school}, {tenth_result} <br />
                12th- {twelfth_school}, {twelfth_result} <br />
                {bachelors_school && (
                    <>
                        Bachelor's- {bachelors_course} <br /> 
                        {bachelors_school}, {bachelors_result} <br />
                    </>
                )}
                <br />
            </div>
            <div>
                Work Experience-
                <ul>
                    {work.map((job, idx) => (
                        <li key={job.company || job.name || idx} style={{ margin: "10px 0" }}>
                            <strong>{(job.company || job.name)}</strong> - {job.description || "No description"}
                            &nbsp;&nbsp;
                            <button className="Button" style={{ fontSize: "28px", padding: "2px 14px", width: "135px", height: "42px", display: "inline-block" }} onClick={() => handleRemoveWork(idx)}>
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>

                {!isAddingWork ? (
                    <button className="Button" style={{ width: "240px", marginBottom: "20px" }} onClick={() => setIsAddingWork(true)}>
                        Add Work Experience
                    </button>
                ) : (
                    <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#A6927E", borderRadius: "8px" }}>
                        Company: <input type="text" value={newWorkCompany} onChange={(e) => setNewWorkCompany(e.target.value)} placeholder="Company Name" style={{ width: "80%", height: "35px", fontSize: "24px" }} /> <br /><br />
                        Description: <textarea value={newWorkDesc} onChange={(e) => setNewWorkDesc(e.target.value)} placeholder="Description..." style={{ width: "80%", height: "80px", fontSize: "24px" }} /> <br /><br />
                        <button className="Button" style={{ width: "220px" }} onClick={handleSaveWork}> Save Work Experience </button> &nbsp;
                        <button className="Button" style={{ width: "120px" }} onClick={() => setIsAddingWork(false)}> Cancel </button>
                    </div>
                )}

                <br />
                Projects-
                <ul>
                    {projects.map((project, idx) => (
                        <li key={project.name || project.title || idx} style={{ margin: "10px 0" }}>
                            <strong>{(project.name || project.title)}</strong> - {project.description || "No description"}
                            &nbsp;&nbsp;
                            <button className="Button" style={{ fontSize: "28px", padding: "2px 14px", width: "135px", height: "42px", display: "inline-block" }} onClick={() => handleRemoveProject(idx)}>
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>

                {!isAddingProject ? (
                    <button className="Button" style={{ width: "200px", marginBottom: "20px" }} onClick={() => setIsAddingProject(true)}>
                        Add Project
                    </button>
                ) : (
                    <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#A6927E", borderRadius: "8px" }}>
                        Title: <input type="text" value={newProjectTitle} onChange={(e) => setNewProjectTitle(e.target.value)} placeholder="Project Title" style={{ width: "80%", height: "35px", fontSize: "24px" }} /> <br /><br />
                        Description: <textarea value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} placeholder="Description..." style={{ width: "80%", height: "80px", fontSize: "24px" }} /> <br /><br />
                        <button className="Button" style={{ width: "180px" }} onClick={handleSaveProject}> Save Project </button> &nbsp;
                        <button className="Button" style={{ width: "120px" }} onClick={() => setIsAddingProject(false)}> Cancel </button>
                    </div>
                )}

                <br />
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

export default ProfileDetails;