import PageHeader from "../Navbar/pageHeader";
import { useState, useEffect, useRef } from "react";
import JobDetails from "./jobDetails";
import office from "../../Assets/Images/office.jpeg";
import ProfileIcon from "../../Assets/Images/ProfileIcon.png";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addApplication, toggleMatchPercentage, setUser } from "../../redux/userSlice";
import MatchBreakdownModal from "../WelcomePage/matchBreakdownModal";

function JobPage(){
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const {id} = useParams();
    const user = useSelector((state)=>state.user.user);
    const showMatchPercentage = useSelector((state)=>state.user.showMatchPercentage);
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isApplying, setIsApplying] = useState(false);
    const [appliedApplicants, setAppliedApplicants] = useState([]);
    const [fetchingApplicants, setFetchingApplicants] = useState(false);
    const [acceptingId, setAcceptingId] = useState(null);
    const [unacceptingId, setUnacceptingId] = useState(null);
    const [breakdownApplicant, setBreakdownApplicant] = useState(null);
    const [uploadingOfferLetter, setUploadingOfferLetter] = useState(false);
    const fileInputRef = useRef(null);
    
    // Proof of Acceptance Modal States
    const [showProofModal, setShowProofModal] = useState(false);
    const [selectedApplicant, setSelectedApplicant] = useState(null);
    const [proofFile, setProofFile] = useState(null);
    const [proofFileName, setProofFileName] = useState("");
    const [proofError, setProofError] = useState("");
    const proofFileInputRef = useRef(null);

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

        if (user?._id && user.type !== "recruiters" && !user.company && !user.positions) {
            fetch(`http://localhost:5000/applicants/${user._id}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.data) {
                        dispatch(setUser({ ...data.data, type: user.type || "applicants" }));
                    }
                })
                .catch(err => console.error("Error syncing applicant status:", err));
        }

    }, [id, user?._id, user?.type, user?.company, user?.positions, dispatch])

    const isRecruiterOwner = user && (user.type === "recruiters" || user.company) && job && (
        (job.recruiterId && user._id && job.recruiterId.toString() === user._id.toString()) ||
        (user.name && (user.name === job.recruiterName || user.name === job.recruiter))
    );

    useEffect(() => {
        if (isRecruiterOwner && id) {
            const fetchApplicants = async () => {
                setFetchingApplicants(true);
                try {
                    const res = await fetch(`http://localhost:5000/job/${id}/applicants?recruiterId=${user._id}`);
                    const data = await res.json();
                    if (res.ok) {
                        setAppliedApplicants(data.data || []);
                    }
                } catch (err) {
                    console.error("Error fetching job applicants:", err);
                } finally {
                    setFetchingApplicants(false);
                }
            };
            fetchApplicants();
        }
    }, [id, isRecruiterOwner, user]);

    if(loading) return <div className="Backlayer start"> Loading...</div>
    if(!job) return <div className="Backlayer start"> Job not found!</div>

    const title = job.title;
    const company = job.company;
    const salary = job.salary;

    const userApps = user?.applications || [];
    const currentApplication = userApps.find(a => (a.id || a.jobId)?.toString() === id?.toString());
    const alreadyApplied = Boolean(currentApplication);
    const isAcceptedForThisJob = currentApplication?.status === "Accepted";
    const hasUploadedOfferLetter = Boolean(currentApplication?.hasOfferLetter || currentApplication?.offerLetter);

    const handleOfferLetterUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            alert("Offer letter file size should be less than 10MB.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Content = reader.result;
            setUploadingOfferLetter(true);
            try {
                const res = await fetch(`http://localhost:5000/applicants/${user._id}/offer-letter`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jobId: id,
                        offerLetter: base64Content,
                        offerLetterName: file.name
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    dispatch(setUser({ ...data.user, type: user.type || "applicants" }));
                    alert("Offer letter uploaded successfully!");
                } else {
                    alert(data.message || "Failed to upload offer letter.");
                }
            } catch (err) {
                console.error("Error uploading offer letter:", err);
                alert("Error uploading offer letter.");
            } finally {
                setUploadingOfferLetter(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleApply = async () => {
        if (!user || user.type === "recruiters") {
            alert("Only registered applicants can apply for jobs!");
            return;
        }

        if (alreadyApplied) {
            alert("You have already applied for this position.");
            return;
        }

        try {
            setIsApplying(true);
            const res = await fetch("http://localhost:5000/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user._id,
                    applicantId: user._id,
                    jobId: id,
                    title: title
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert("Application submitted successfully!");
                dispatch(addApplication({
                    id: id,
                    jobId: id,
                    title: title,
                    company: company,
                    status: "Applied"
                }));
            } else {
                alert(data.message || "Failed to submit application.");
            }
        } catch (err) {
            console.error("Application error:", err);
            alert("Error submitting application.");
        } finally {
            setIsApplying(false);
        }
    };

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

    const openAcceptModal = (applicant) => {
        setSelectedApplicant(applicant);
        setProofFile(null);
        setProofFileName("");
        setProofError("");
        setShowProofModal(true);
    };

    const handleProofFileSelect = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
        const ext = file.name.split('.').pop().toLowerCase();
        
        if (!validExtensions.includes(ext)) {
            setProofError("Invalid file format. Please upload a PDF or Image file (.pdf, .jpg, .jpeg, .png).");
            setProofFile(null);
            setProofFileName("");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setProofError("File size exceeds 10MB limit. Please choose a smaller file.");
            setProofFile(null);
            setProofFileName("");
            return;
        }

        setProofError("");
        setProofFile(file);
        setProofFileName(file.name);
    };

    const submitAcceptWithProof = async () => {
        if (!selectedApplicant) return;
        if (!proofFile) {
            setProofError("Proof of acceptance document (PDF or JPG/PNG image) is required to accept an applicant.");
            return;
        }

        setAcceptingId(selectedApplicant._id);
        setProofError("");

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Data = reader.result;
            try {
                const res = await fetch("http://localhost:5000/job/accept-applicant", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jobId: id,
                        applicantId: selectedApplicant._id,
                        recruiterId: user._id,
                        proofDocument: base64Data,
                        proofDocumentName: proofFileName || proofFile.name
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    alert(data.message || "Applicant accepted successfully!");
                    const acceptedProofName = data.acceptanceProofName || proofFileName;

                    setAppliedApplicants((prev) => prev.map((app) => {
                        if (app._id === selectedApplicant._id) {
                            const existingApps = app.applications || [];
                            const hasRecord = existingApps.some(a => (a.id === id || a.jobId === id || a.id?.toString() === id?.toString() || a.jobId?.toString() === id?.toString()));
                            const updatedApps = hasRecord 
                                ? existingApps.map(a => (a.id === id || a.jobId === id || a.id?.toString() === id?.toString() || a.jobId?.toString() === id?.toString()) 
                                    ? { ...a, status: "Accepted", hasAcceptanceProof: true, acceptanceProofName: acceptedProofName } 
                                    : a)
                                : [...existingApps, { id: id, jobId: id, title: title, status: "Accepted", hasAcceptanceProof: true, acceptanceProofName: acceptedProofName }];
                            return { ...app, applications: updatedApps };
                        }
                        return app;
                    }));

                    setShowProofModal(false);
                    setSelectedApplicant(null);
                    setProofFile(null);
                    setProofFileName("");
                } else {
                    setProofError(data.message || "Failed to accept applicant.");
                }
            } catch (err) {
                console.error(err);
                setProofError("Failed to connect to server!");
            } finally {
                setAcceptingId(null);
            }
        };
        reader.readAsDataURL(proofFile);
    };

    const handleUnacceptApplicant = async (applicant) => {
        if (!applicant || unacceptingId) return;

        if (!window.confirm(`Are you sure you want to un-accept ${applicant.name} for ${title}? This will reset their application status to Applied and remove the acceptance proof document.`)) {
            return;
        }

        setUnacceptingId(applicant._id);
        try {
            const res = await fetch("http://localhost:5000/job/unaccept-applicant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobId: id,
                    applicantId: applicant._id,
                    recruiterId: user._id
                })
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message || "Candidate application status reset to Applied.");
                setAppliedApplicants((prev) => prev.map((app) => {
                    if (app._id === applicant._id) {
                        const existingApps = app.applications || [];
                        const updatedApps = existingApps.map(a => {
                            if (a.id === id || a.jobId === id || a.id?.toString() === id?.toString() || a.jobId?.toString() === id?.toString()) {
                                const { acceptanceProof, acceptanceProofName, acceptedAt, ...rest } = a;
                                return { ...rest, status: "Applied", hasAcceptanceProof: false };
                            }
                            return a;
                        });
                        return { ...app, applications: updatedApps };
                    }
                    return app;
                }));
            } else {
                alert(data.message || "Failed to un-accept candidate.");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to connect to server!");
        } finally {
            setUnacceptingId(null);
        }
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
                        isAcceptedForThisJob ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "15px", marginTop: "15px" }}>
                                <a
                                    href={`http://localhost:5000/applicants/${user._id}/acceptance-proof-file?jobId=${id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Click to view Placement Cell's Proof of Acceptance"
                                    style={{
                                        backgroundColor: "#2e7d32",
                                        color: "white",
                                        padding: "6px 18px",
                                        borderRadius: "20px",
                                        fontSize: "28px",
                                        textDecoration: "underline",
                                        display: "inline-block"
                                    }}
                                >
                                    Accepted ✓ (View Placement Proof)
                                </a>

                                <div style={{ display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
                                    {hasUploadedOfferLetter ? (
                                        <>
                                            <span style={{ color: "#1565c0", fontSize: "28px" }}>
                                                ✓ Offer Letter Uploaded ({currentApplication.offerLetterName || "Offer Letter"})
                                            </span>
                                            <a
                                                href={`http://localhost:5000/applicants/${user._id}/offer-letter-file?jobId=${id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="Button"
                                                style={{
                                                    height: "45px",
                                                    width: "auto",
                                                    padding: "0 20px",
                                                    fontSize: "24px",
                                                    margin: "0",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    backgroundColor: "#1565c0",
                                                    textDecoration: "none",
                                                    color: "white"
                                                }}
                                            >
                                                View My Offer Letter
                                            </a>
                                            <label
                                                className="Button"
                                                style={{
                                                    height: "45px",
                                                    width: "auto",
                                                    padding: "0 20px",
                                                    fontSize: "24px",
                                                    margin: "0",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    cursor: "pointer",
                                                    backgroundColor: "#555"
                                                }}
                                            >
                                                {uploadingOfferLetter ? "Uploading..." : "Change File"}
                                                <input
                                                    type="file"
                                                    accept=".pdf,.doc,.docx,image/*"
                                                    style={{ display: "none" }}
                                                    onChange={handleOfferLetterUpload}
                                                    disabled={uploadingOfferLetter}
                                                />
                                            </label>
                                        </>
                                    ) : (
                                        <label
                                            className="Button"
                                            style={{
                                                height: "55px",
                                                width: "auto",
                                                padding: "0 25px",
                                                fontSize: "28px",
                                                margin: "0",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: "pointer"
                                            }}
                                        >
                                            {uploadingOfferLetter ? "Uploading..." : "Upload Offer Letter"}
                                            <input
                                                type="file"
                                                accept=".pdf,.doc,.docx,image/*"
                                                style={{ display: "none" }}
                                                onChange={handleOfferLetterUpload}
                                                disabled={uploadingOfferLetter}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <button className="Button" onClick={handleApply} disabled={alreadyApplied || isApplying}>
                                {alreadyApplied ? "Applied" : isApplying ? "Applying..." : "Apply now!"}
                            </button>
                        )
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

            {isRecruiterOwner && (
                <div className="Textpartition" style={{ flexDirection: "column", marginTop: "30px", alignItems: "flex-start", width: "100%", boxSizing: "border-box" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "15px", flexWrap: "wrap", gap: "15px" }}>
                        <div style={{ fontSize: "36px", fontWeight: "bold" }}>
                            Applicants Who Applied for This Position ({appliedApplicants.length})
                        </div>
                        <div 
                            onClick={() => dispatch(toggleMatchPercentage())}
                            style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "12px", 
                                cursor: "pointer",
                                fontSize: "28px",
                                userSelect: "none",
                                backgroundColor: "#B7202E",
                                color: "#fff",
                                padding: "6px 16px",
                                borderRadius: "10px"
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
                    {fetchingApplicants ? (
                        <p style={{ fontSize: "28px" }}>Loading applicants...</p>
                    ) : appliedApplicants.length === 0 ? (
                        <p style={{ fontStyle: "italic", color: "#eee", fontSize: "28px" }}>No candidates have applied for this job yet.</p>
                    ) : (
                        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
                            {(showMatchPercentage
                                ? appliedApplicants
                                : [...appliedApplicants].sort((a, b) => (a._id || "").toString().localeCompare((b._id || "").toString()))
                            ).map((applicant) => {
                                const isAccepted = (applicant.applications || []).some(
                                    a => (a.id === id || a.jobId === id || a.id?.toString() === id?.toString() || a.jobId?.toString() === id?.toString()) && a.status === "Accepted"
                                );
                                return (
                                    <div 
                                        key={applicant._id} 
                                        style={{ 
                                            border: "2px solid rgba(255,255,255,0.3)", 
                                            borderRadius: "12px", 
                                            padding: "18px 24px", 
                                            display: "flex", 
                                            justifyContent: "space-between", 
                                            alignItems: "center",
                                            backgroundColor: "rgba(0,0,0,0.25)",
                                            flexWrap: "wrap",
                                            gap: "15px"
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                                            <img 
                                                src={applicant.profilePic || ProfileIcon} 
                                                alt="Applicant Avatar" 
                                                style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "2px solid #B7202E" }} 
                                            />
                                            <div>
                                                <div style={{ fontWeight: "bold", fontSize: "32px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                                                    {applicant.name}
                                                    {showMatchPercentage && applicant.matchPercentage !== undefined && (
                                                        <span 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setBreakdownApplicant(applicant);
                                                            }}
                                                            title="Click to view Algorithmic Match Breakdown"
                                                            style={{ 
                                                                backgroundColor: applicant.matchPercentage >= 75 ? "#2e7d32" : applicant.matchPercentage >= 50 ? "#ed6c02" : "#555",
                                                                color: "#fff",
                                                                padding: "4px 14px",
                                                                borderRadius: "16px",
                                                                fontSize: "22px",
                                                                fontWeight: "bold",
                                                                cursor: "pointer",
                                                                border: "2px solid rgba(255,255,255,0.65)",
                                                                boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                                                            }}
                                                        >
                                                            {applicant.matchPercentage}% Match 🔍
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: "26px", marginTop: "6px", color: "#f5f5f5" }}>
                                                    Email: {applicant.email} | YoE: {applicant.yoe || 0} | Age: {applicant.age || "N/A"}
                                                </div>
                                                {(() => {
                                                    const appRec = (applicant.applications || []).find(a => a.id === id || a.jobId === id || a.id?.toString() === id?.toString() || a.jobId?.toString() === id?.toString());
                                                    if (appRec && appRec.hasOfferLetter) {
                                                        return (
                                                            <div style={{ marginTop: "10px" }}>
                                                                <a 
                                                                    href={`http://localhost:5000/applicants/${applicant._id}/offer-letter-file?jobId=${id}`} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer" 
                                                                    style={{ 
                                                                        color: "#76ff03", 
                                                                        backgroundColor: "rgba(0, 0, 0, 0.4)", 
                                                                        padding: "6px 14px", 
                                                                        borderRadius: "8px", 
                                                                        fontSize: "24px", 
                                                                        fontWeight: "bold",
                                                                        textDecoration: "underline",
                                                                        display: "inline-block"
                                                                    }}
                                                                >
                                                                    📄 View Candidate Offer Letter ({appRec.offerLetterName || "Document"})
                                                                </a>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                                            <button 
                                                className="Button" 
                                                onClick={() => navigate(`/applicants/${applicant._id}`)}
                                                style={{ fontSize: "24px", padding: "10px 20px" }}
                                            >
                                                View Full Profile
                                            </button>
                                            {isAccepted ? (
                                                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                                                    <a 
                                                        href={`http://localhost:5000/applicants/${applicant._id}/acceptance-proof-file?jobId=${id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Click to view Placement Cell Proof of Acceptance"
                                                        style={{ 
                                                            backgroundColor: "#2e7d32", 
                                                            color: "#fff", 
                                                            padding: "10px 18px", 
                                                            borderRadius: "8px", 
                                                            fontWeight: "bold",
                                                            fontSize: "22px",
                                                            textDecoration: "underline",
                                                            display: "inline-block"
                                                        }}
                                                    >
                                                        ✓ Accepted (View Proof)
                                                    </a>
                                                    <button 
                                                        className="Button" 
                                                        style={{ backgroundColor: "#c62828", color: "#fff", fontSize: "20px", padding: "8px 16px", minWidth: "auto", width: "auto", height: "auto" }}
                                                        onClick={() => handleUnacceptApplicant(applicant)}
                                                        disabled={unacceptingId === applicant._id}
                                                        title="Revoke acceptance and reset candidate to Applied status"
                                                    >
                                                        {unacceptingId === applicant._id ? "Revoking..." : "Un-accept"}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    className="Button" 
                                                    style={{ backgroundColor: "#2e7d32", color: "#fff", fontSize: "24px", padding: "10px 20px" }}
                                                    onClick={() => openAcceptModal(applicant)}
                                                    disabled={acceptingId === applicant._id}
                                                >
                                                    {acceptingId === applicant._id ? "Accepting..." : "Accept"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Proof of Acceptance Upload Modal */}
        {showProofModal && selectedApplicant && (
            <div style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.75)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999,
                padding: "20px"
            }}>
                <div style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "16px",
                    padding: "32px",
                    maxWidth: "660px",
                    width: "100%",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                    color: "#1A1A1A",
                    fontFamily: "'JustAnotherHand', sans-serif"
                }}>
                    <h2 style={{ color: "#B7202E", fontSize: "46px", marginTop: 0, marginBottom: "16px", borderBottom: "2px solid #FAECEE", paddingBottom: "10px", fontWeight: "normal" }}>
                        Proof of Acceptance Required
                    </h2>
                    <p style={{ fontSize: "30px", color: "#333", lineHeight: "1.35", marginBottom: "20px" }}>
                        To mark candidate <strong>{selectedApplicant.name}</strong> as <strong>Accepted</strong> for position <strong>{title}</strong>, please upload proof of acceptance (e.g., offer letter, screenshot of email, or confirmation document as PDF or JPG/PNG image).
                    </p>

                    <div style={{ 
                        border: "2px dashed #B7202E", 
                        borderRadius: "12px", 
                        padding: "24px", 
                        textAlign: "center",
                        backgroundColor: "#FAECEE",
                        marginBottom: "20px"
                    }}>
                        <input 
                            type="file" 
                            ref={proofFileInputRef}
                            accept=".pdf,.jpg,.jpeg,.png,image/*" 
                            onChange={handleProofFileSelect} 
                            style={{ display: "none" }} 
                        />
                        <button 
                            type="button" 
                            className="Button" 
                            onClick={() => proofFileInputRef.current && proofFileInputRef.current.click()}
                            style={{ fontSize: "30px", padding: "8px 24px", width: "auto", marginBottom: "12px" }}
                        >
                            📁 Choose File (PDF, JPG, PNG)
                        </button>
                        {proofFileName ? (
                            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#2e7d32", wordBreak: "break-all" }}>
                                Selected File: ✓ {proofFileName}
                            </div>
                        ) : (
                            <div style={{ fontSize: "26px", color: "#666", fontStyle: "italic" }}>
                                No file selected yet (Required to proceed)
                            </div>
                        )}
                    </div>

                    {proofError && (
                        <div style={{ 
                            backgroundColor: "#ffebee", 
                            color: "#c62828", 
                            padding: "12px 16px", 
                            borderRadius: "8px", 
                            marginBottom: "20px",
                            fontWeight: "bold",
                            fontSize: "26px",
                            border: "1px solid #ef9a9a"
                        }}>
                            ⚠️ {proofError}
                        </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", marginTop: "10px" }}>
                        <button 
                            type="button"
                            className="Button"
                            onClick={() => { setShowProofModal(false); setSelectedApplicant(null); setProofFile(null); setProofError(""); }}
                            style={{ backgroundColor: "#757575", fontSize: "30px", padding: "8px 20px", width: "auto" }}
                            disabled={acceptingId !== null}
                        >
                            Cancel
                        </button>
                        <button 
                            type="button"
                            className="Button"
                            onClick={submitAcceptWithProof}
                            style={{ 
                                backgroundColor: proofFile ? "#2e7d32" : "#9e9e9e", 
                                cursor: proofFile ? "pointer" : "not-allowed",
                                fontSize: "30px", 
                                padding: "8px 24px", 
                                width: "auto" 
                            }}
                            disabled={!proofFile || acceptingId !== null}
                        >
                            {acceptingId ? "Accepting..." : "Confirm & Accept"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <MatchBreakdownModal 
            isOpen={!!breakdownApplicant}
            onClose={() => setBreakdownApplicant(null)}
            title={breakdownApplicant?.name}
            subtitle={`Applied for ${title}`}
            matchPercentage={breakdownApplicant?.matchPercentage}
            matchBreakdown={breakdownApplicant?.matchBreakdown}
        />
    </div>
    )
}

export default JobPage;