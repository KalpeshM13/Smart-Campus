import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

import getDashboardMetrics from '@salesforce/apex/SmartCampusController.getDashboardMetrics';
import getComplaints from '@salesforce/apex/SmartCampusController.getComplaints';
import createComplaint from '@salesforce/apex/SmartCampusController.createComplaint';
import updateComplaintStatus from '@salesforce/apex/SmartCampusController.updateComplaintStatus';
import submitCSATFeedback from '@salesforce/apex/SmartCampusController.submitCSATFeedback';
import reassignComplaint from '@salesforce/apex/SmartCampusController.reassignComplaint';
import getCategories from '@salesforce/apex/SmartCampusController.getCategories';
import getDepartments from '@salesforce/apex/SmartCampusController.getDepartments';
import getQueues from '@salesforce/apex/SmartCampusController.getQueues';
import getFeedbackList from '@salesforce/apex/SmartCampusController.getFeedbackList';

export default class SmartCampusPortal extends LightningElement {
    @track activeTab = 'requester'; // 'requester', 'staff', 'admin'
    @track isLoading = false;
    
    // Metrics
    @track metrics = {
        totalComplaints: 0,
        openComplaints: 0,
        inProgressComplaints: 0,
        onHoldComplaints: 0,
        resolvedComplaints: 0,
        closedComplaints: 0,
        overdueComplaints: 0,
        averageCsat: 0.0,
        totalFeedbackCount: 0,
        departmentBreakdown: [],
        categoryBreakdown: []
    };

    // Reference Data
    @track categories = [];
    @track departments = [];
    @track queues = [];
    @track feedbackRecords = [];

    // Complaints Data & Filtering
    @track complaints = [];
    @track searchTerm = '';
    @track statusFilter = 'ALL';
    @track selectedDepartmentId = '';

    // Modals Control
    @track isNewModalOpen = false;
    @track isStatusModalOpen = false;
    @track isFeedbackModalOpen = false;
    @track isDetailModalOpen = false;

    // Active Selected Record for Actions
    @track selectedCase = null;

    // Form inputs: New Request
    @track newForm = {
        subject: '',
        categoryId: '',
        priority: 'Medium',
        campus: 'Main Campus',
        building: '',
        room: '',
        description: ''
    };
    @track dynamicSlaBadge = 'Select a category to view SLA';

    // Form inputs: Status Update
    @track statusForm = {
        newStatus: 'In Progress',
        resolutionNotes: '',
        holdReason: ''
    };

    // Form inputs: CSAT Feedback
    @track feedbackForm = {
        rating: 5,
        comments: ''
    };

    // Wires
    wiredMetricsResult;
    @wire(getDashboardMetrics)
    wiredMetrics(result) {
        this.wiredMetricsResult = result;
        if (result.data) {
            this.metrics = result.data;
        } else if (result.error) {
            this.showToast('Error', 'Failed to load metrics: ' + this.getErrorMessage(result.error), 'error');
        }
    }

    @wire(getCategories)
    wiredCategories({ data, error }) {
        if (data) {
            this.categories = data.map(c => ({
                label: c.Name,
                value: c.Id,
                highSla: c.SLA_Hours_High__c || 24,
                medSla: c.SLA_Hours_Medium__c || 72,
                lowSla: c.SLA_Hours_Low__c || 120
            }));
        }
    }

    @wire(getDepartments)
    wiredDepartments({ data, error }) {
        if (data) {
            this.departments = data.map(d => ({
                label: d.Name,
                value: d.Id
            }));
        }
    }

    @wire(getQueues)
    wiredQueues({ data, error }) {
        if (data) {
            this.queues = data.map(q => ({
                label: q.Name,
                value: q.Id
            }));
        }
    }

    connectedCallback() {
        this.fetchComplaints();
        this.fetchFeedback();
    }

    // Tab Handlers
    handleTabSelect(event) {
        this.activeTab = event.target.value;
        this.fetchComplaints();
    }

    get isRequesterTab() {
        return this.activeTab === 'requester';
    }

    get isStaffTab() {
        return this.activeTab === 'staff';
    }

    get isAdminTab() {
        return this.activeTab === 'admin';
    }

    // Complaints Query
    fetchComplaints() {
        this.isLoading = true;
        const viewMode = this.activeTab === 'staff' ? 'department' : (this.activeTab === 'admin' ? 'all' : 'my');
        
        getComplaints({
            viewMode: viewMode,
            departmentId: this.selectedDepartmentId,
            statusFilter: this.statusFilter,
            searchTerm: this.searchTerm
        })
        .then(result => {
            this.complaints = result.map(c => {
                const isOverdue = c.Is_Overdue__c || (c.SLA_Target_Time__c && new Date(c.SLA_Target_Time__c) < new Date() && !['Resolved', 'Closed', 'Rejected'].includes(c.Status));
                return {
                    ...c,
                    categoryName: c.Complaint_Category__r ? c.Complaint_Category__r.Name : 'General',
                    departmentName: c.Department__r ? c.Department__r.Name : 'Unassigned',
                    ownerName: c.Owner ? c.Owner.Name : 'None',
                    locationStr: [c.Building__c, c.Room__c].filter(Boolean).join(', ') || 'Campus',
                    statusClass: this.computeStatusBadgeClass(c.Status),
                    priorityClass: this.computePriorityBadgeClass(c.Priority),
                    isOverdue: isOverdue,
                    canRate: c.Status === 'Resolved' || c.Status === 'Closed',
                    canResolve: c.Status === 'In Progress' || c.Status === 'In_Progress' || c.Status === 'On Hold' || c.Status === 'On_Hold' || c.Status === 'Assigned',
                    canHold: c.Status === 'In Progress' || c.Status === 'In_Progress'
                };
            });
            this.isLoading = false;
        })
        .catch(error => {
            this.isLoading = false;
            this.showToast('Error', 'Failed to fetch tickets: ' + this.getErrorMessage(error), 'error');
        });
    }

    fetchFeedback() {
        getFeedbackList()
        .then(data => {
            this.feedbackRecords = data.map(f => ({
                ...f,
                caseNumber: f.Case__r ? f.Case__r.CaseNumber : 'N/A',
                caseSubject: f.Case__r ? f.Case__r.Subject : 'N/A',
                stars: '⭐'.repeat(f.Rating__c || 0)
            }));
        })
        .catch(err => {
            console.error('Feedback fetch err:', err);
        });
    }

    handleRefresh() {
        if (this.wiredMetricsResult) {
            refreshApex(this.wiredMetricsResult);
        }
        this.fetchComplaints();
        this.fetchFeedback();
        this.showToast('Refreshed', 'Latest campus operations data updated.', 'info');
    }

    // Filter Handlers
    handleSearch(event) {
        this.searchTerm = event.target.value;
        this.fetchComplaints();
    }

    handleStatusFilterChange(event) {
        this.statusFilter = event.target.value;
        this.fetchComplaints();
    }

    handleDepartmentChange(event) {
        this.selectedDepartmentId = event.target.value;
        this.fetchComplaints();
    }

    // Badges Styling
    computeStatusBadgeClass(status) {
        switch (status) {
            case 'New': return 'slds-badge slds-badge_lightest badge-new';
            case 'Assigned': return 'slds-badge slds-theme_alt-inverse badge-assigned';
            case 'In Progress':
            case 'In_Progress': return 'slds-badge slds-theme_warning badge-in-progress';
            case 'On Hold':
            case 'On_Hold': return 'slds-badge slds-theme_offline badge-on-hold';
            case 'Resolved': return 'slds-badge slds-theme_success badge-resolved';
            case 'Closed': return 'slds-badge slds-theme_default badge-closed';
            case 'Rejected': return 'slds-badge slds-theme_error badge-rejected';
            default: return 'slds-badge slds-badge_lightest';
        }
    }

    computePriorityBadgeClass(priority) {
        switch (priority) {
            case 'High': return 'slds-badge priority-high';
            case 'Medium': return 'slds-badge priority-medium';
            case 'Low': return 'slds-badge priority-low';
            default: return 'slds-badge';
        }
    }

    // MODAL: New Request
    openNewModal() {
        this.newForm = {
            subject: '',
            categoryId: '',
            priority: 'Medium',
            campus: 'Main Campus',
            building: '',
            room: '',
            description: ''
        };
        this.updateSlaPreview();
        this.isNewModalOpen = true;
    }

    closeNewModal() {
        this.isNewModalOpen = false;
    }

    handleNewFormChange(event) {
        const field = event.target.name;
        this.newForm[field] = event.target.value;
        if (field === 'categoryId' || field === 'priority') {
            this.updateSlaPreview();
        }
    }

    updateSlaPreview() {
        if (!this.newForm.categoryId) {
            this.dynamicSlaBadge = 'Select category to compute SLA target';
            return;
        }
        const cat = this.categories.find(c => c.value === this.newForm.categoryId);
        if (!cat) return;

        let hours = 72;
        if (this.newForm.priority === 'High') hours = cat.highSla;
        else if (this.newForm.priority === 'Medium') hours = cat.medSla;
        else if (this.newForm.priority === 'Low') hours = cat.lowSla;

        this.dynamicSlaBadge = `⚡ Guaranteed SLA Resolution: ${hours} Hours`;
    }

    handleSubmitNewRequest() {
        if (!this.newForm.subject || this.newForm.subject.trim().length === 0) {
            this.showToast('Validation Error', 'Please enter a title/subject for the service request.', 'warning');
            return;
        }

        this.isLoading = true;
        createComplaint({
            params: {
                subject: this.newForm.subject,
                description: this.newForm.description,
                categoryId: this.newForm.categoryId,
                priority: this.newForm.priority,
                campus: this.newForm.campus,
                building: this.newForm.building,
                room: this.newForm.room
            }
        })
        .then(created => {
            this.isLoading = false;
            this.closeNewModal();
            this.showToast('Success', `Case ${created.CaseNumber} registered and automatically routed to department queue!`, 'success');
            if (this.wiredMetricsResult) refreshApex(this.wiredMetricsResult);
            this.fetchComplaints();
        })
        .catch(err => {
            this.isLoading = false;
            this.showToast('Error', 'Failed to register ticket: ' + this.getErrorMessage(err), 'error');
        });
    }

    // MODAL: Work Order / Status Update
    openStatusModal(event) {
        const caseId = event.target.dataset.id;
        this.selectedCase = this.complaints.find(c => c.Id === caseId);
        if (!this.selectedCase) return;

        this.statusForm = {
            newStatus: 'In Progress',
            resolutionNotes: this.selectedCase.Resolution_Notes__c || '',
            holdReason: this.selectedCase.Hold_Reason__c || ''
        };
        this.isStatusModalOpen = true;
    }

    closeStatusModal() {
        this.isStatusModalOpen = false;
        this.selectedCase = null;
    }

    handleStatusFormChange(event) {
        this.statusForm[event.target.name] = event.target.value;
    }

    get priorityOptions() {
        return [
            { label: 'High (24h SLA)', value: 'High' },
            { label: 'Medium (72h SLA)', value: 'Medium' },
            { label: 'Low (120h SLA)', value: 'Low' }
        ];
    }

    get isHoldStatus() {
        return this.statusForm.newStatus === 'On Hold' || this.statusForm.newStatus === 'On_Hold';
    }

    get isResolvedStatus() {
        return this.statusForm.newStatus === 'Resolved';
    }

    get statusOptions() {
        return [
            { label: 'In Progress (Active Work)', value: 'In Progress' },
            { label: 'On Hold (Pending Parts / Info)', value: 'On Hold' },
            { label: 'Resolved (Work Complete)', value: 'Resolved' },
            { label: 'Closed (Archived)', value: 'Closed' },
            { label: 'Rejected (Invalid / Duplicate)', value: 'Rejected' }
        ];
    }

    handleSaveStatusUpdate() {
        if (this.isResolvedStatus && (!this.statusForm.resolutionNotes || this.statusForm.resolutionNotes.trim().length < 10)) {
            this.showToast('Validation Error', 'Technical resolution notes (minimum 10 characters) are mandatory before marking Resolved.', 'error');
            return;
        }

        if (this.isHoldStatus && (!this.statusForm.holdReason || this.statusForm.holdReason.trim().length < 3)) {
            this.showToast('Validation Error', 'A valid justification reason is required when placing this ticket on hold.', 'error');
            return;
        }

        this.isLoading = true;
        updateComplaintStatus({
            caseId: this.selectedCase.Id,
            newStatus: this.statusForm.newStatus,
            resolutionNotes: this.statusForm.resolutionNotes,
            holdReason: this.statusForm.holdReason
        })
        .then(updated => {
            this.isLoading = false;
            this.closeStatusModal();
            this.showToast('Success', `Case ${updated.CaseNumber} updated to ${updated.Status}`, 'success');
            if (this.wiredMetricsResult) refreshApex(this.wiredMetricsResult);
            this.fetchComplaints();
        })
        .catch(err => {
            this.isLoading = false;
            this.showToast('Error', this.getErrorMessage(err), 'error');
        });
    }

    // MODAL: CSAT Feedback
    openFeedbackModal(event) {
        const caseId = event.target.dataset.id;
        this.selectedCase = this.complaints.find(c => c.Id === caseId);
        if (!this.selectedCase) return;

        this.feedbackForm = { rating: 5, comments: '' };
        this.isFeedbackModalOpen = true;
    }

    closeFeedbackModal() {
        this.isFeedbackModalOpen = false;
        this.selectedCase = null;
    }

    handleRatingClick(event) {
        this.feedbackForm.rating = parseInt(event.target.dataset.rating, 10);
    }

    handleFeedbackCommentsChange(event) {
        this.feedbackForm.comments = event.target.value;
    }

    get ratingStars() {
        return [
            { val: 1, active: this.feedbackForm.rating >= 1 },
            { val: 2, active: this.feedbackForm.rating >= 2 },
            { val: 3, active: this.feedbackForm.rating >= 3 },
            { val: 4, active: this.feedbackForm.rating >= 4 },
            { val: 5, active: this.feedbackForm.rating >= 5 }
        ];
    }

    handleSubmitFeedback() {
        this.isLoading = true;
        submitCSATFeedback({
            caseId: this.selectedCase.Id,
            rating: this.feedbackForm.rating,
            comments: this.feedbackForm.comments
        })
        .then(() => {
            this.isLoading = false;
            this.closeFeedbackModal();
            this.showToast('Thank You!', 'Your CSAT feedback has been recorded and the Case is now Closed.', 'success');
            if (this.wiredMetricsResult) refreshApex(this.wiredMetricsResult);
            this.fetchComplaints();
            this.fetchFeedback();
        })
        .catch(err => {
            this.isLoading = false;
            this.showToast('Error', 'Failed to submit feedback: ' + this.getErrorMessage(err), 'error');
        });
    }

    // MODAL: Detail View
    openDetailModal(event) {
        const caseId = event.target.dataset.id;
        this.selectedCase = this.complaints.find(c => c.Id === caseId);
        if (this.selectedCase) {
            this.isDetailModalOpen = true;
        }
    }

    closeDetailModal() {
        this.isDetailModalOpen = false;
        this.selectedCase = null;
    }

    // Helper: Toast & Error Parsing
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    getErrorMessage(error) {
        if (!error) return 'Unknown error';
        if (error.body && error.body.message) return error.body.message;
        if (error.message) return error.message;
        return JSON.stringify(error);
    }
}
