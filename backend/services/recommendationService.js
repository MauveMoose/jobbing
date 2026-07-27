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
            job.tags.forEach(t => allJobTags.add(t.toLowerCase()));
        }
        if (Array.isArray(job.skillsNeeded)) {
            job.skillsNeeded.forEach(s => allJobTags.add(s.toLowerCase()));
        }
        if (typeof job.yoeNeeded === "number" && job.yoeNeeded < minYoE) {
            minYoE = job.yoeNeeded;
        }
    });

    if (minYoE === Infinity) minYoE = 0;
    const jobTagList = Array.from(allJobTags);

    const rankedApplicants = applicants.map(applicant => {
        let score = 0;

        // 1. YoE Match Score (30 pts max)
        const appYoE = applicant.yoe || 0;
        if (appYoE >= minYoE) {
            score += 30;
        } else if (minYoE > 0) {
            score += Math.round((appYoE / minYoE) * 20);
        }

        // 2. Tag / Skill Overlap Score (50 pts max)
        const appTags = (applicant.tags || []).map(t => t.toLowerCase());
        const appWorkText = (applicant.work || []).map(w => `${w.company || ''} ${w.description || ''}`).join(" ").toLowerCase();
        const appProjText = (applicant.projects || []).map(p => `${p.name || p.title || ''} ${p.description || ''}`).join(" ").toLowerCase();

        if (jobTagList.length > 0) {
            let matchedCount = 0;
            jobTagList.forEach(tag => {
                if (appTags.includes(tag) || appWorkText.includes(tag) || appProjText.includes(tag)) {
                    matchedCount++;
                }
            });
            const matchRatio = matchedCount / jobTagList.length;
            score += Math.round(matchRatio * 50);
        } else {
            score += 30;
        }

        // 3. Application Bonus (20 pts max)
        const applied = (applicant.applications || []).some(app =>
            recruiterJobs.some(rj => rj._id.toString() === (app.id || app.jobId)?.toString())
        );
        if (applied) {
            score += 20;
        }

        const matchPercentage = Math.min(100, Math.max(25, score));
        return {
            ...applicant,
            matchPercentage,
            hasApplied: applied
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

        // 1. YoE Suitability (30 pts max)
        const jobYoE = job.yoeNeeded || 0;
        if (appYoE >= jobYoE) {
            score += 30;
        } else if (jobYoE > 0) {
            score += Math.round((appYoE / jobYoE) * 20);
        }

        // 2. Tag / Skill Overlap Score (50 pts max)
        const jobTags = new Set();
        if (Array.isArray(job.tags)) {
            job.tags.forEach(t => jobTags.add(t.toLowerCase()));
        }
        if (Array.isArray(job.skillsNeeded)) {
            job.skillsNeeded.forEach(s => jobTags.add(s.toLowerCase()));
        }

        const jobTagList = Array.from(jobTags);
        if (jobTagList.length > 0) {
            let matchedCount = 0;
            jobTagList.forEach(tag => {
                if (appTags.includes(tag) || appWorkText.includes(tag) || appProjText.includes(tag)) {
                    matchedCount++;
                }
            });
            const matchRatio = matchedCount / jobTagList.length;
            score += Math.round(matchRatio * 50);
        } else {
            score += 30;
        }

        // 3. Application Status Check (20 pts if applied)
        const hasApplied = appApplications.some(app => 
            (app.id || app.jobId)?.toString() === job._id?.toString()
        );
        if (hasApplied) {
            score += 20;
        }

        const matchPercentage = Math.min(100, Math.max(25, score));
        return {
            ...job,
            matchPercentage,
            hasApplied
        };
    });

    rankedJobs.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
    return rankedJobs;
}
