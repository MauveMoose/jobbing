/**
 * Ranks candidates for a recruiter based on YoE, Skill Tag Overlap, and Application Status
 */
export function rankApplicantsForRecruiter({ applicants = [], recruiterJobs = [] }) {
    if (!recruiterJobs || recruiterJobs.length === 0) {
        return applicants;
    }

    const allJobTags = new Set();
    let minYoE = Infinity;

    recruiterJobs.forEach(job => {
        if (Array.isArray(job.tags)) {
            job.tags.forEach(t => { if (t && t.trim()) allJobTags.add(t.trim().toLowerCase()); });
        }
        if (Array.isArray(job.skillsNeeded)) {
            job.skillsNeeded.forEach(s => { if (s && s.trim()) allJobTags.add(s.trim().toLowerCase()); });
        }
        if (typeof job.yoeNeeded === "number" && job.yoeNeeded < minYoE) {
            minYoE = job.yoeNeeded;
        }
    });

    if (minYoE === Infinity) minYoE = 0;
    const jobTagList = Array.from(allJobTags);

    const rankedApplicants = applicants.map(applicant => {
        let score = 0;
        let yoeScore = 0;
        let skillScore = 0;
        let appliedBonus = 0;

        // 1. YoE Match Score (30 pts max)
        const appYoE = applicant.yoe || 0;
        if (appYoE >= minYoE) {
            yoeScore = 30;
        } else if (minYoE > 0) {
            yoeScore = Math.round((appYoE / minYoE) * 20);
        }
        score += yoeScore;

        // 2. Tag / Skill Overlap Score (50 pts max)
        const appTags = (applicant.tags || []).map(t => t.toLowerCase());
        const appWorkText = (applicant.work || []).map(w => `${w.company || ''} ${w.description || ''}`).join(" ").toLowerCase();
        const appProjText = (applicant.projects || []).map(p => `${p.name || p.title || ''} ${p.description || ''}`).join(" ").toLowerCase();

        const matchedSkills = [];
        const missingSkills = [];

        if (jobTagList.length > 0) {
            jobTagList.forEach(tag => {
                if (appTags.includes(tag) || appWorkText.includes(tag) || appProjText.includes(tag)) {
                    matchedSkills.push(tag);
                } else {
                    missingSkills.push(tag);
                }
            });
            const matchRatio = matchedSkills.length / jobTagList.length;
            skillScore = Math.round(matchRatio * 50);
        } else {
            skillScore = 30;
        }
        score += skillScore;

        // 3. Application Bonus (20 pts max)
        const applied = (applicant.applications || []).some(app =>
            recruiterJobs.some(rj => rj._id.toString() === (app.id || app.jobId)?.toString())
        );
        if (applied) {
            appliedBonus = 20;
        }
        score += appliedBonus;

        const matchPercentage = Math.min(100, Math.max(25, score));
        return {
            ...applicant,
            matchPercentage,
            hasApplied: applied,
            matchBreakdown: {
                yoeScore,
                candidateYoE: appYoE,
                requiredYoE: minYoE,
                skillScore,
                matchedSkills,
                missingSkills,
                appliedBonus,
                totalRawScore: score,
                finalScore: matchPercentage
            }
        };
    });

    rankedApplicants.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
    return rankedApplicants;
}

/**
 * Ranks job postings for an applicant based on YoE suitability, Skill Tag Overlap, and Application Status
 */
export function rankJobsForApplicant({ jobs = [], applicant = null }) {
    if (!applicant) {
        return jobs;
    }

    const appYoE = applicant.yoe || 0;
    const appTags = (applicant.tags || []).map(t => t.toLowerCase());
    const appWorkText = (applicant.work || []).map(w => `${w.company || ''} ${w.description || ''}`).join(" ").toLowerCase();
    const appProjText = (applicant.projects || []).map(p => `${p.name || p.title || ''} ${p.description || ''}`).join(" ").toLowerCase();
    const appApplications = applicant.applications || [];

    const rankedJobs = jobs.map(job => {
        let score = 0;
        let yoeScore = 0;
        let skillScore = 0;
        let appliedBonus = 0;

        // 1. YoE Suitability (30 pts max)
        const jobYoE = job.yoeNeeded || 0;
        if (appYoE >= jobYoE) {
            yoeScore = 30;
        } else if (jobYoE > 0) {
            yoeScore = Math.round((appYoE / jobYoE) * 20);
        }
        score += yoeScore;

        // 2. Tag / Skill Overlap Score (50 pts max)
        const jobTags = new Set();
        if (Array.isArray(job.tags)) {
            job.tags.forEach(t => { if (t && t.trim()) jobTags.add(t.trim().toLowerCase()); });
        }
        if (Array.isArray(job.skillsNeeded)) {
            job.skillsNeeded.forEach(s => { if (s && s.trim()) jobTags.add(s.trim().toLowerCase()); });
        }

        const jobTagList = Array.from(jobTags);
        const matchedSkills = [];
        const missingSkills = [];

        if (jobTagList.length > 0) {
            jobTagList.forEach(tag => {
                if (appTags.includes(tag) || appWorkText.includes(tag) || appProjText.includes(tag)) {
                    matchedSkills.push(tag);
                } else {
                    missingSkills.push(tag);
                }
            });
            const matchRatio = matchedSkills.length / jobTagList.length;
            skillScore = Math.round(matchRatio * 50);
        } else {
            skillScore = 30;
        }
        score += skillScore;

        // 3. Application Status Check (20 pts if applied)
        const applicationRecord = appApplications.find(app => 
            (app.id || app.jobId)?.toString() === job._id?.toString()
        );
        const hasApplied = !!applicationRecord;
        const applicationStatus = applicationRecord ? (applicationRecord.status || "Applied") : null;

        if (hasApplied) {
            appliedBonus = 20;
        }
        score += appliedBonus;

        const matchPercentage = Math.min(100, Math.max(25, score));
        return {
            ...job,
            matchPercentage,
            hasApplied,
            applicationStatus,
            matchBreakdown: {
                yoeScore,
                candidateYoE: appYoE,
                requiredYoE: jobYoE,
                skillScore,
                matchedSkills,
                missingSkills,
                appliedBonus,
                totalRawScore: score,
                finalScore: matchPercentage
            }
        };
    });

    rankedJobs.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
    return rankedJobs;
}
