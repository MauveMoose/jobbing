import PageHeader from "../Navbar/pageHeader";
import UserComponent from "./userComponent";
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { toggleMatchPercentage } from "../../redux/userSlice";

function WelcomePageRecruiter(){
    const dispatch = useDispatch();
    const user = useSelector((state)=>state.user.user);
    const showMatchPercentage = useSelector((state)=>state.user.showMatchPercentage);
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(()=>{
        const fetchapplicants = async () => {
            try{
                const url = user?._id 
                    ? `http://localhost:5000/findusers?recruiterId=${user._id}`
                    : "http://localhost:5000/findusers";
                const res = await fetch(url);
                const applicantsData = await res.json();
                if(res.ok){
                    setApplicants(applicantsData.data);
                }
                else{
                    alert(applicantsData.message);
                }
            }
            catch(err){
                console.log(err);
            }
            finally{
                setLoading(false);
            }
        }

        fetchapplicants();
    }, [user]);

    if(!user){
        return <Navigate to="/" replace />
    }

    if(loading){
        return (
        <div className="Backlayer start"> Loading applicants...</div>
        )
    }

    const displayedApplicants = showMatchPercentage
        ? applicants
        : [...applicants].sort((a, b) => (a._id || "").toString().localeCompare((b._id || "").toString()));

    return(
    <div className='Backlayer'>
        <PageHeader />
        <div className="Bodysection">
            <div className="Textpartition title">
                <span>Applicants you might like...</span>
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
            {displayedApplicants.length===0 && <p>No applicants found matching your parameters!</p>}
            {displayedApplicants.map((applicant)=>(
                <UserComponent key={applicant._id}
                    id={applicant._id}
                    name={applicant.name}
                    age={applicant.age}
                    yoe={applicant.yoe}
                    work={applicant.work}
                    profilePic={applicant.profilePic}
                    matchPercentage={applicant.matchPercentage}
                    matchBreakdown={applicant.matchBreakdown}
                    hasApplied={applicant.hasApplied}
                />
            ))}
        </div>
    </div>
    )
}

export default WelcomePageRecruiter;