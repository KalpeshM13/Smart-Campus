public with sharing class SmartCampusController {

    public class DashboardMetrics {
        @AuraEnabled public Integer totalComplaints { get; set; }
        @AuraEnabled public Integer openComplaints { get; set; }
        @AuraEnabled public Integer inProgressComplaints { get; set; }
        @AuraEnabled public Integer onHoldComplaints { get; set; }
        @AuraEnabled public Integer resolvedComplaints { get; set; }
        @AuraEnabled public Integer closedComplaints { get; set; }
        @AuraEnabled public Integer overdueComplaints { get; set; }
        @AuraEnabled public Decimal averageCsat { get; set; }
        @AuraEnabled public Integer totalFeedbackCount { get; set; }
        @AuraEnabled public List<AggregateItem> departmentBreakdown { get; set; }
        @AuraEnabled public List<AggregateItem> categoryBreakdown { get; set; }
    }

    public class AggregateItem {
        @AuraEnabled public String label { get; set; }
        @AuraEnabled public Integer count { get; set; }
        public AggregateItem(String label, Integer count) {
            this.label = label;
            this.count = count;
        }
    }

    @AuraEnabled(cacheable=true)
    public static DashboardMetrics getDashboardMetrics() {
        DashboardMetrics metrics = new DashboardMetrics();
        metrics.totalComplaints = [SELECT count() FROM Case];
        metrics.openComplaints = [SELECT count() FROM Case WHERE Status = 'New' OR Status = 'Assigned'];
        metrics.inProgressComplaints = [SELECT count() FROM Case WHERE Status = 'In Progress' OR Status = 'In_Progress'];
        metrics.onHoldComplaints = [SELECT count() FROM Case WHERE Status = 'On Hold' OR Status = 'On_Hold'];
        metrics.resolvedComplaints = [SELECT count() FROM Case WHERE Status = 'Resolved'];
        metrics.closedComplaints = [SELECT count() FROM Case WHERE Status = 'Closed'];
        
        DateTime nowTime = System.now();
        metrics.overdueComplaints = [SELECT count() FROM Case WHERE Status != 'Resolved' AND Status != 'Closed' AND Status != 'Rejected' AND SLA_Target_Time__c != null AND SLA_Target_Time__c < :nowTime];

        AggregateResult[] csatAgg = [SELECT AVG(Rating__c) avgRating, COUNT(Id) totalCount FROM Complaint_Feedback__c];
        if (!csatAgg.isEmpty() && csatAgg[0].get('avgRating') != null) {
            metrics.averageCsat = ((Decimal)csatAgg[0].get('avgRating')).setScale(1);
            metrics.totalFeedbackCount = (Integer)csatAgg[0].get('totalCount');
        } else {
            metrics.averageCsat = 0.0;
            metrics.totalFeedbackCount = 0;
        }

        metrics.departmentBreakdown = new List<AggregateItem>();
        for (AggregateResult ar : [SELECT Department__r.Name deptName, COUNT(Id) cnt FROM Case GROUP BY Department__r.Name LIMIT 10]) {
            String name = (String)ar.get('deptName');
            if (String.isNotBlank(name)) {
                metrics.departmentBreakdown.add(new AggregateItem(name, (Integer)ar.get('cnt')));
            }
        }

        metrics.categoryBreakdown = new List<AggregateItem>();
        for (AggregateResult ar : [SELECT Complaint_Category__r.Name catName, COUNT(Id) cnt FROM Case GROUP BY Complaint_Category__r.Name LIMIT 10]) {
            String name = (String)ar.get('catName');
            if (String.isNotBlank(name)) {
                metrics.categoryBreakdown.add(new AggregateItem(name, (Integer)ar.get('cnt')));
            }
        }

        return metrics;
    }

    @AuraEnabled(cacheable=true)
    public static List<Case> getComplaints(String viewMode, String departmentId, String statusFilter, String searchTerm) {
        String query = 'SELECT Id, CaseNumber, Subject, Description, Status, Priority, CreatedDate, ClosedDate, ' +
                       'OwnerId, Owner.Name, Complaint_Category__c, Complaint_Category__r.Name, Complaint_Category__r.Code__c, ' +
                       'Department__c, Department__r.Name, Department__r.Code__c, ' +
                       'Campus_Location__c, Building__c, Room__c, Resolution_Notes__c, Hold_Reason__c, ' +
                       'SLA_Target_Time__c, Is_Overdue__c ' +
                       'FROM Case WHERE Id != null ';

        if (viewMode == 'my') {
            Id currentUserId = UserInfo.getUserId();
            query += 'AND CreatedById = :currentUserId ';
        } else if (viewMode == 'department' && String.isNotBlank(departmentId)) {
            query += 'AND Department__c = :departmentId ';
        }

        if (String.isNotBlank(statusFilter) && statusFilter != 'ALL') {
            if (statusFilter == 'OPEN') {
                query += 'AND (Status = \'New\' OR Status = \'Assigned\') ';
            } else if (statusFilter == 'IN_PROGRESS') {
                query += 'AND (Status = \'In Progress\' OR Status = \'In_Progress\') ';
            } else if (statusFilter == 'ON_HOLD') {
                query += 'AND (Status = \'On Hold\' OR Status = \'On_Hold\') ';
            } else if (statusFilter == 'RESOLVED') {
                query += 'AND Status = \'Resolved\' ';
            } else if (statusFilter == 'CLOSED') {
                query += 'AND Status = \'Closed\' ';
            } else {
                query += 'AND Status = :statusFilter ';
            }
        }

        if (String.isNotBlank(searchTerm)) {
            String likeTerm = '%' + String.escapeSingleQuotes(searchTerm) + '%';
            query += 'AND (Subject LIKE :likeTerm OR CaseNumber LIKE :likeTerm OR Building__c LIKE :likeTerm OR Room__c LIKE :likeTerm) ';
        }

        query += 'ORDER BY CreatedDate DESC LIMIT 200';
        return Database.query(query);
    }

    @AuraEnabled
    public static Case createComplaint(Map<String, Object> params) {
        String subject = (String)params.get('subject');
        String description = (String)params.get('description');
        String categoryId = (String)params.get('categoryId');
        String priority = (String)params.get('priority');
        String campus = (String)params.get('campus');
        String building = (String)params.get('building');
        String room = (String)params.get('room');

        if (String.isBlank(subject)) {
            AuraHandledException ex = new AuraHandledException('Subject / Title is required');
            ex.setMessage('Subject / Title is required');
            throw ex;
        }

        Case c = new Case();
        c.Subject = subject;
        c.Description = description;
        c.Priority = String.isNotBlank(priority) ? priority : 'Medium';
        c.Campus_Location__c = String.isNotBlank(campus) ? campus : 'Main Campus';
        c.Building__c = building;
        c.Room__c = room;
        c.Origin = 'Web';
        c.Status = 'New';

        if (String.isNotBlank(categoryId)) {
            c.Complaint_Category__c = categoryId;
        }

        insert c;
        return [
            SELECT Id, CaseNumber, Subject, Status, Priority, SLA_Target_Time__c, Owner.Name,
                   Department__r.Name, Complaint_Category__r.Name
            FROM Case 
            WHERE Id = :c.Id
        ];
    }

    @AuraEnabled
    public static Case updateComplaintStatus(Id caseId, String newStatus, String resolutionNotes, String holdReason) {
        Case c = [SELECT Id, Status, Resolution_Notes__c, Hold_Reason__c FROM Case WHERE Id = :caseId LIMIT 1];

        if (newStatus == 'Resolved') {
            if (String.isBlank(resolutionNotes) || resolutionNotes.trim().length() < 10) {
                AuraHandledException ex = new AuraHandledException('Technical resolution notes (minimum 10 characters) are mandatory before marking this Case as Resolved.');
                ex.setMessage('Technical resolution notes (minimum 10 characters) are mandatory before marking this Case as Resolved.');
                throw ex;
            }
            c.Resolution_Notes__c = resolutionNotes;
        }

        if (newStatus == 'On Hold' || newStatus == 'On_Hold') {
            if (String.isBlank(holdReason) || holdReason.trim().length() < 3) {
                AuraHandledException ex = new AuraHandledException('A valid justification is required when placing this Case on hold.');
                ex.setMessage('A valid justification is required when placing this Case on hold.');
                throw ex;
            }
            c.Hold_Reason__c = holdReason;
        }

        c.Status = newStatus;
        update c;
        return [
            SELECT Id, CaseNumber, Subject, Status, Priority, Resolution_Notes__c, Hold_Reason__c, Owner.Name,
                   Department__r.Name, Complaint_Category__r.Name
            FROM Case 
            WHERE Id = :caseId
        ];
    }

    @AuraEnabled
    public static Complaint_Feedback__c submitCSATFeedback(Id caseId, Integer rating, String comments) {
        if (rating == null || rating < 1 || rating > 5) {
            AuraHandledException ex = new AuraHandledException('Rating must be between 1 and 5 stars.');
            ex.setMessage('Rating must be between 1 and 5 stars.');
            throw ex;
        }

        Complaint_Feedback__c fb = new Complaint_Feedback__c();
        fb.Case__c = caseId;
        fb.Rating__c = rating;
        fb.Comments__c = comments;
        fb.Requester_Id__c = UserInfo.getUserName();
        fb.Submitted_Date__c = System.now();
        insert fb;
        return fb;
    }

    @AuraEnabled
    public static Case reassignComplaint(Id caseId, Id targetOwnerId) {
        Case c = new Case(Id = caseId, OwnerId = targetOwnerId, Status = 'Assigned');
        update c;
        return [SELECT Id, CaseNumber, Subject, Status, Owner.Name FROM Case WHERE Id = :caseId];
    }

    @AuraEnabled(cacheable=true)
    public static List<Complaint_Category__c> getCategories() {
        return [
            SELECT Id, Name, Code__c, Default_Department__c, Default_Department__r.Name, 
                   SLA_Hours_High__c, SLA_Hours_Medium__c, SLA_Hours_Low__c, Is_Active__c 
            FROM Complaint_Category__c 
            WHERE Is_Active__c = true 
            ORDER BY Name ASC
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Department__c> getDepartments() {
        return [
            SELECT Id, Name, Code__c, Queue_Name__c, Contact_Email__c, Is_Active__c 
            FROM Department__c 
            WHERE Is_Active__c = true 
            ORDER BY Name ASC
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Group> getQueues() {
        return [SELECT Id, Name, DeveloperName FROM Group WHERE Type = 'Queue' ORDER BY Name ASC];
    }

    @AuraEnabled(cacheable=true)
    public static List<Complaint_Feedback__c> getFeedbackList() {
        return [
            SELECT Id, Name, Case__c, Case__r.CaseNumber, Case__r.Subject, Rating__c, Comments__c, Requester_Id__c, Submitted_Date__c 
            FROM Complaint_Feedback__c 
            ORDER BY Submitted_Date__c DESC NULLS LAST 
            LIMIT 100
        ];
    }
}
