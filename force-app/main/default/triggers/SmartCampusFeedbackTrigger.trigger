trigger SmartCampusFeedbackTrigger on Complaint_Feedback__c (after insert) {
    Set<Id> caseIds = new Set<Id>();
    for (Complaint_Feedback__c fb : Trigger.new) {
        if (fb.Case__c != null) {
            caseIds.add(fb.Case__c);
        }
    }
    
    if (!caseIds.isEmpty()) {
        List<Case> casesToUpdate = new List<Case>();
        for (Case c : [SELECT Id, Status FROM Case WHERE Id IN :caseIds AND Status != 'Closed']) {
            c.Status = 'Closed';
            casesToUpdate.add(c);
        }
        if (!casesToUpdate.isEmpty()) {
            update casesToUpdate;
        }
    }
}
