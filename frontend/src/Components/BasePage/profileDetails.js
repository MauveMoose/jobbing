import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

function ProfileDetails(){
    const user = useSelector((state)=>state.user.user);
    if(!user) return <Navigate to="/" replace />   

    const name = user.name;
    const email = user.email;
    const age = user.age;
    const yoe = user.yoe;
    const tenth_school = user.tenth_school;
    const tenth_result = user.tenth_result;
    const twelfth_school = user.twelfth_school;
    const twelfth_result = user.twelfth_result;
    const bachelors_course = user.bachelors_course;
    const bachelors_school = user.bachelors_school;
    const bachelors_result = user.bachelors_result;
    const work = user.work || [];
    const projects = user.projects || [];
    const applications = user.applications || [];

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

export default ProfileDetails;