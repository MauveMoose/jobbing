import {useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

function JobForm(){
    const user = useSelector((state)=>state.user.user);
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title:"",
        company:"",
        companyEmail:"",
        salary:0,
        description:"",
        yoeNeeded:0,
        benefits:[""],
        skillsNeeded:[""],
        recruiter: user?.name || "Jobbing",
        applications:[""]
    })

    const handleChange = (e) => {
        setFormData({...formData, [e.target.name]:e.target.value})
    }

    const handleArrayChange = (index, value, key) => {
        setFormData((previousFormData) => ({
            ...previousFormData,
            [key]: previousFormData[key].map((item, i)=>
                (i === index ? value:item)
            ),
        }))
    }

    const addArrayItem = (key) => {
        setFormData((previousFormData) => ({
            ...previousFormData, 
            [key]: [...previousFormData[key], ""],
        }))
    }

    const removeArrayItem = (key, index) => {
        setFormData((previousFormData) => ({
            ...previousFormData, 
            [key]: previousFormData[key].filter((_, i) => i !== index),
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        const errors = [];
        if (!formData.title || !formData.title.trim()) errors.push("Job Title is missing");
        if (!formData.company || !formData.company.trim()) errors.push("Company Name is missing");

        const trimmedEmail = formData.companyEmail ? formData.companyEmail.trim() : "";
        if (trimmedEmail !== "") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmedEmail)) {
                errors.push("Invalid Company Email format. Please enter a valid email address or leave blank.");
            }
        }

        if (formData.salary === "" || formData.salary === null || Number(formData.salary) <= 0) {
            errors.push("Salary is required and must be greater than 0");
        }
        if (formData.yoeNeeded === "" || formData.yoeNeeded === null || Number(formData.yoeNeeded) < 0) {
            errors.push("Years of Experience Needed is required (0 or higher)");
        }
        if (!formData.description || !formData.description.trim()) errors.push("Job Description is missing");

        if (errors.length > 0) {
            return alert("Please fix the following issue(s) before submitting:\n\n• " + errors.join("\n• "));
        }

        setIsSubmitting(true);

        try {
            const dataToSend = {
                ...formData,
                title: formData.title.trim(),
                company: formData.company.trim(),
                companyEmail: trimmedEmail ? trimmedEmail.toLowerCase() : "",
                salary: Number(formData.salary) || 0,
                yoeNeeded: Number(formData.yoeNeeded) || 0,
                benefits: formData.benefits.filter(b => b.trim() !== ""),
                skillsNeeded: formData.skillsNeeded.filter(s => s.trim() !== ""),
                recruiterId: user?._id,
                recruiterName: user?.name || "Jobbing",
                recruiter: user?.name || "Jobbing"
            };

            const res = await fetch("http://localhost:5000/job/register", {
                method:  "POST",
                headers: {"Content-Type":"application/json"},
                body:JSON.stringify(dataToSend),
            });
            
            if(res.ok){
                const successMsg = trimmedEmail 
                    ? `Job successfully registered! Student applications will be routed directly to ${trimmedEmail}.`
                    : `Job successfully registered! Student applications will be routed to your Placement Cell email.`;
                alert(successMsg);
                navigate("/profile/recruiters");
            }
            else{
                const data = await res.json();
                alert(data.message || "Failed to post job");
                setIsSubmitting(false);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to submit job due to a network error. Please try again.");
            setIsSubmitting(false);
        }
    }

    return(
        <form onSubmit={handleSubmit} noValidate>
            Title: <input type="text" name="title" value={formData.title} onChange={handleChange} disabled={isSubmitting} required /> <br />
            Company: <input type="text" name="company" value={formData.company} onChange={handleChange} disabled={isSubmitting} required /> <br />
            Company Email (Optional & Private - for direct candidate applications): <input type="email" name="companyEmail" placeholder="hiring@company.com (Optional)" value={formData.companyEmail} onChange={handleChange} disabled={isSubmitting} /> <br />
            Salary: <input type="number" name="salary" value={formData.salary} onChange={handleChange} disabled={isSubmitting} required /> <br />
            Years of Experience needed: <input type="number" name="yoeNeeded" value={formData.yoeNeeded} onChange={handleChange} disabled={isSubmitting} required /> <br />
            Description:
            <textarea name="description" placeholder='Description...' value={formData.description} onChange={handleChange} disabled={isSubmitting} required /> <br />
            Benefits:
            {formData.benefits.map((benefit, i) => (
                <div key={i} className='Entry-field'>
                    <input type="text" placeholder='Benefit' value={benefit} onChange={(e)=>handleArrayChange(i, e.target.value, "benefits")} disabled={isSubmitting} /> <br />
                    <button className="Button" type="button" onClick={()=>removeArrayItem("benefits", i)} disabled={isSubmitting}> Remove Benefit </button> <br />
                </div>
            ))}
            <button className="Button" type="button" onClick={()=>addArrayItem("benefits")} disabled={isSubmitting}> Add Benefit </button> <br />
            Skills Needed:
            {formData.skillsNeeded.map((skill, i) => (
                <div key={i} className='Entry-field'>
                    <input type="text" placeholder='Skill' value={skill} onChange={(e)=>handleArrayChange(i, e.target.value, "skillsNeeded")} disabled={isSubmitting} /> <br />
                    <button className="Button" type="button" onClick={()=>removeArrayItem("skillsNeeded", i)} disabled={isSubmitting}> Remove Skill </button> <br />
                </div>
            ))}
            <button className="Button" type="button" onClick={()=>addArrayItem("skillsNeeded")} disabled={isSubmitting}> Add Skill </button> <br />
            <button className="Button" type="submit" disabled={isSubmitting}> {isSubmitting ? "Posting Job..." : "Submit"} </button>
        </form>
    )
}

export default JobForm;