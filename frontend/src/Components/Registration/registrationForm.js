import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function RegistrationForm(){
    const navigate = useNavigate();
    const location = useLocation();
    const prefilled = location.state?.prefilledData || {};

    const [formData, setFormData] = useState({
        name: prefilled.name || "",
        email: prefilled.email || "",
        password: "",
        age: prefilled.age || 0,
        yoe: prefilled.yoe || 0,
        tenth_school: prefilled.tenth_school || "",
        tenth_result: prefilled.tenth_result || "",
        twelfth_school: prefilled.twelfth_school || "",
        twelfth_result: prefilled.twelfth_result || "",
        bachelors_school: prefilled.bachelors_school || "",
        bachelors_course: prefilled.bachelors_course || "",
        bachelors_result: prefilled.bachelors_result || "",
        work: prefilled.work && prefilled.work.length > 0 
            ? prefilled.work.map(w => ({ company: w.company || w.name || "", description: w.description || "" }))
            : [{company:"", description:""}],
        projects: prefilled.projects && prefilled.projects.length > 0 
            ? prefilled.projects.map(p => ({ name: p.name || p.title || "", description: p.description || "" }))
            : [{name:"", description:""}],
        type: "applicants",
        applications: []
    });

    const [confirm, setConfirm] = useState("");

    const handleChange = (e) => {
        setFormData({...formData, [e.target.name]:e.target.value})
    }

    const handleArrayChange = (index, field, value, key) => {
        setFormData((previousFormData) => ({
            ...previousFormData,
            [key]: previousFormData[key].map((item, i)=>
                i === index ? {...item, [field]: value}:item
            ),
        }))
    }

    const addArrayItem = (key, emptyItem) => {
        setFormData((previousFormData) => ({
            ...previousFormData, 
            [key]: [...previousFormData[key], emptyItem],
        }))
    }

    const removeArrayItem = (key, arrayItem) => {
        setFormData((previousFormData) => ({
            ...previousFormData, 
            [key]: previousFormData[key].filter((_, i) => i !== arrayItem),
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        const errors = [];
        if (!formData.name || !formData.name.trim()) errors.push("Full Name is missing");
        
        const emailRegex = /^[^\s@]+@somaiya\.edu$/i;
        if (!formData.email || !emailRegex.test(formData.email.trim())) {
            errors.push("Email must be a valid @somaiya.edu address");
        }
        if (!formData.password || formData.password.length < 4) {
            errors.push("Password must be at least 4 characters long");
        }
        if (formData.password !== confirm) {
            errors.push("Passwords do not match");
        }
        if (!formData.age || Number(formData.age) < 18) {
            errors.push("Age must be 18 or higher");
        }
        if (formData.yoe === "" || formData.yoe === null || Number(formData.yoe) < 0) {
            errors.push("Years of Experience is required (0 or higher)");
        }
        if (Number(formData.age) > 0 && Number(formData.yoe) > Number(formData.age)) {
            errors.push("Years of Experience cannot be greater than Age");
        }
        if (!formData.tenth_school || !formData.tenth_school.trim()) {
            errors.push("10th Grade School Name is missing");
        }
        if (!formData.tenth_result || !formData.tenth_result.trim()) {
            errors.push("10th Grade Score/Percentage is missing");
        }
        if (!formData.twelfth_school || !formData.twelfth_school.trim()) {
            errors.push("12th Grade School Name is missing");
        }
        if (!formData.twelfth_result || !formData.twelfth_result.trim()) {
            errors.push("12th Grade Score/Percentage is missing");
        }

        if (errors.length > 0) {
            return alert("Please fix the following issue(s) before submitting:\n\n• " + errors.join("\n• "));
        }

        const res = await fetch("http://localhost:5000/applicants/register", {
            method:  "POST",
            headers: {"Content-Type":"application/json"},
            body:JSON.stringify({
                ...formData,
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase()
            }),
        });

        const data = await res.json();
        if(res.ok){
            alert("Registration successful!");
            navigate("/");
        }
        else{
            alert(data.message || "Registration failed.");
        }
    }

    return(
        <form onSubmit={handleSubmit} noValidate>
            {location.state?.prefilledData && (
                <div style={{ color: "#4CAF50", marginBottom: "15px", fontWeight: "bold" }}>
                    ✓ Resume details pre-filled! Please review your info and create a password below.
                </div>
            )}
            Full name: <input type="text" name="name" value={formData.name} onChange={handleChange} required /> <br />
            Email: <input type="email" name="email" value={formData.email} onChange={handleChange} required /> <br />
            Password: <input type="password" name="password" value={formData.password} onChange={handleChange} required /> <br />
            Confirm password: <input type="password" name="confirm" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required /> <br />
            Age: <input type="number" name="age" value={formData.age} onChange={handleChange} />
            Years of experience: <input type="number" name="yoe" value={formData.yoe} onChange={handleChange}/> 
            <h4 > 10th grade </h4> <br />
            School name: <input type="text" name="tenth_school" value={formData.tenth_school} onChange={handleChange} /> <br />
            GPA/Percentage: <input type="text" name="tenth_result" value={formData.tenth_result} onChange={handleChange} /> 
            <h4 > 12th grade </h4> <br />
            School name: <input type="text" name="twelfth_school" value={formData.twelfth_school} onChange={handleChange} /> <br />
            GPA/Percentage: <input type="text" name="twelfth_result" value={formData.twelfth_result} onChange={handleChange}/> 
            <h4 > Bachelor's (optional) </h4> <br />
            Course/Program: <input type="text" name="bachelors_course" value={formData.bachelors_course} onChange={handleChange}/> <br />
            University name: <input type="text" name="bachelors_school" value={formData.bachelors_school} onChange={handleChange}/> <br />
            GPA/Percentage: <input type="text" name="bachelors_result" value={formData.bachelors_result} onChange={handleChange} /> <br />
            Work Experience:
            {formData.work.map((job, i) => (
                <div key={i} className='Entry-field'>
                    <input type="text" placeholder='Company' value={job.company} onChange={(e)=>handleArrayChange(i, "company", e.target.value, "work")} /> <br />
                    <textarea placeholder='Description...' value={job.description} onChange={(e)=>handleArrayChange(i, "description", e.target.value, "work")} /> <br />
                    <button className="Button" type="button" onClick={()=>removeArrayItem("work", i)}> Remove Work Experience </button> <br />
                </div>
            ))}
            <button className="Button" type="button" onClick={()=>addArrayItem("work", {company:"", description:""})}> Add Work Experience </button> <br />
            Projects:
            {formData.projects.map((project, i)=>(
                <div key={i} className='Entry-field'>
                    <input type="text" placeholder='Title' value={project.name} onChange={(e)=>handleArrayChange(i, "name", e.target.value, "projects")} /> <br />
                    <textarea placeholder='Description' value={project.description} onChange={(e)=>handleArrayChange(i, "description", e.target.value, "projects")} /> <br />
                    <button className="Button" type="button" onClick={()=>removeArrayItem("projects", i)}> Remove Project </button> <br />
                </div>
            ))}
            <button className="Button" type="button" onClick={()=>addArrayItem("projects", {name:"", description:""})}> Add Project </button> <br />
            <button className="Button" type="submit"> Submit </button>
        </form>
    )
}

export default RegistrationForm;