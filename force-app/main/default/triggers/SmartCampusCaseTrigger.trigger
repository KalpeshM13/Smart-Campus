trigger SmartCampusCaseTrigger on Case (before insert, before update) {
    if (Trigger.isBefore && Trigger.isInsert) {
        Set<Id> catIds = new Set<Id>();
        for (Case c : Trigger.new) {
            if (c.Complaint_Category__c != null) {
                catIds.add(c.Complaint_Category__c);
            }
        }
        
        Map<Id, Complaint_Category__c> catMap = new Map<Id, Complaint_Category__c>();
        if (!catIds.isEmpty()) {
            catMap = new Map<Id, Complaint_Category__c>([
                SELECT Id, Default_Department__c, Default_Department__r.Queue_Name__c, 
                       SLA_Hours_High__c, SLA_Hours_Medium__c, SLA_Hours_Low__c 
                FROM Complaint_Category__c 
                WHERE Id IN :catIds
            ]);
        }
        
        Set<String> queueNames = new Set<String>();
        for (Complaint_Category__c cat : catMap.values()) {
            if (cat.Default_Department__r != null && String.isNotBlank(cat.Default_Department__r.Queue_Name__c)) {
                queueNames.add(cat.Default_Department__r.Queue_Name__c);
            }
        }
        
        Map<String, Id> queueMap = new Map<String, Id>();
        if (!queueNames.isEmpty()) {
            for (Group g : [SELECT Id, DeveloperName FROM Group WHERE Type = 'Queue' AND DeveloperName IN :queueNames]) {
                queueMap.put(g.DeveloperName, g.Id);
            }
        }
        
        for (Case c : Trigger.new) {
            if (c.Complaint_Category__c != null && catMap.containsKey(c.Complaint_Category__c)) {
                Complaint_Category__c cat = catMap.get(c.Complaint_Category__c);
                if (c.Department__c == null) {
                    c.Department__c = cat.Default_Department__c;
                }
                
                // Calculate SLA Target Time if not set
                if (c.SLA_Target_Time__c == null) {
                    Decimal hours = 72;
                    if (c.Priority == 'High' && cat.SLA_Hours_High__c != null) {
                        hours = cat.SLA_Hours_High__c;
                    } else if (c.Priority == 'Medium' && cat.SLA_Hours_Medium__c != null) {
                        hours = cat.SLA_Hours_Medium__c;
                    } else if (c.Priority == 'Low' && cat.SLA_Hours_Low__c != null) {
                        hours = cat.SLA_Hours_Low__c;
                    }
                    c.SLA_Target_Time__c = System.now().addHours(hours.intValue());
                }
                
                // Route to Queue
                if (cat.Default_Department__r != null && String.isNotBlank(cat.Default_Department__r.Queue_Name__c)) {
                    String qName = cat.Default_Department__r.Queue_Name__c;
                    if (queueMap.containsKey(qName)) {
                        c.OwnerId = queueMap.get(qName);
                        c.Status = 'Assigned';
                    }
                }
            }
        }
    }
    
    if (Trigger.isBefore && Trigger.isUpdate) {
        DateTime nowTime = System.now();
        for (Case c : Trigger.new) {
            Case oldC = Trigger.oldMap.get(c.Id);
            
            // Mandatory Technical Resolution Notes
            if (c.Status == 'Resolved' && oldC.Status != 'Resolved') {
                if (String.isBlank(c.Resolution_Notes__c) || c.Resolution_Notes__c.trim().length() < 10) {
                    c.addError('Technical resolution notes (minimum 10 characters) are mandatory before marking this Case as Resolved.');
                }
            }
            
            // Mandatory Hold Reason
            if ((c.Status == 'On Hold' || c.Status == 'On_Hold') && (oldC.Status != 'On Hold' && oldC.Status != 'On_Hold')) {
                if (String.isBlank(c.Hold_Reason__c) || c.Hold_Reason__c.trim().length() < 3) {
                    c.addError('A valid justification is required when placing this Case on hold.');
                }
            }
            
            // Overdue check
            if (c.Status != 'Resolved' && c.Status != 'Closed' && c.Status != 'Rejected') {
                if (c.SLA_Target_Time__c != null && c.SLA_Target_Time__c < nowTime) {
                    c.Is_Overdue__c = true;
                }
            }
        }
    }
}
