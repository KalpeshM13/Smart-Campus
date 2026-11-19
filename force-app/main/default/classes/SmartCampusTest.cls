@isTest
private class SmartCampusTest {

    @testSetup
    static void setupData() {
        Department__c dept = new Department__c(
            Name = 'Test IT Department',
            Code__c = 'TIT',
            Queue_Name__c = 'IT_Queue',
            Contact_Email__c = 'it-test@smartcampus.edu',
            Is_Active__c = true
        );
        insert dept;

        Complaint_Category__c cat = new Complaint_Category__c(
            Name = 'Test Wi-Fi Network',
            Code__c = 'TWIFI',
            Default_Department__c = dept.Id,
            SLA_Hours_High__c = 24,
            SLA_Hours_Medium__c = 72,
            SLA_Hours_Low__c = 120,
            Is_Active__c = true
        );
        insert cat;
    }

    @isTest
    static void testComplaintLifecycleAndController() {
        Complaint_Category__c cat = [SELECT Id FROM Complaint_Category__c LIMIT 1];
        Department__c dept = [SELECT Id FROM Department__c LIMIT 1];

        Test.startTest();

        // 1. Test create complaint
        Map<String, Object> params = new Map<String, Object>{
            'subject' => 'Wi-Fi connection drop in Library 2nd floor',
            'description' => 'Students losing connectivity during exam period.',
            'categoryId' => cat.Id,
            'priority' => 'High',
            'campus' => 'Main Campus',
            'building' => 'Central Library',
            'room' => 'Reading Room 204'
        };
        Case createdCase = SmartCampusController.createComplaint(params);
        System.assertNotEquals(null, createdCase.Id);

        // 2. Test Get Dashboard Metrics
        SmartCampusController.DashboardMetrics metrics = SmartCampusController.getDashboardMetrics();
        System.assert(metrics.totalComplaints >= 1);

        // 3. Test Get Complaints with various filters
        List<Case> myCases = SmartCampusController.getComplaints('all', null, 'ALL', 'Library');
        System.assert(myCases.size() >= 1);

        List<Case> openCases = SmartCampusController.getComplaints('all', null, 'OPEN', '');
        System.assert(openCases.size() >= 1);

        // 4. Test Update Status: In Progress
        Case inProg = SmartCampusController.updateComplaintStatus(createdCase.Id, 'In Progress', null, null);
        System.assertEquals('In Progress', inProg.Status);

        // 5. Test Update Status: On Hold with reason
        Case onHold = SmartCampusController.updateComplaintStatus(createdCase.Id, 'On Hold', null, 'Awaiting router replacement');
        System.assertEquals('On Hold', onHold.Status);

        // 6. Test Update Status: Resolved with resolution notes
        Case resolved = SmartCampusController.updateComplaintStatus(createdCase.Id, 'Resolved', 'Replaced faulty Cisco AP transceiver on second floor.', null);
        System.assertEquals('Resolved', resolved.Status);

        // 7. Test Submit CSAT Feedback
        Complaint_Feedback__c fb = SmartCampusController.submitCSATFeedback(createdCase.Id, 5, 'Great and prompt response!');
        System.assertNotEquals(null, fb.Id);

        Case closedCase = [SELECT Id, Status FROM Case WHERE Id = :createdCase.Id];
        System.assertEquals('Closed', closedCase.Status);

        // 8. Test Reference Queries
        List<Complaint_Category__c> cats = SmartCampusController.getCategories();
        System.assert(cats.size() >= 1);

        List<Department__c> depts = SmartCampusController.getDepartments();
        System.assert(depts.size() >= 1);

        List<Group> queues = SmartCampusController.getQueues();
        System.assertNotEquals(null, queues);

        List<Complaint_Feedback__c> fbs = SmartCampusController.getFeedbackList();
        System.assert(fbs.size() >= 1);

        Test.stopTest();
    }

    @isTest
    static void testValidationErrors() {
        Case c = new Case(Subject = 'Test Validation Case', Status = 'New');
        insert c;

        Boolean caughtResolved = false;
        try {
            SmartCampusController.updateComplaintStatus(c.Id, 'Resolved', 'short', null);
        } catch (Exception e) {
            caughtResolved = true;
        }
        System.assert(caughtResolved, 'Should catch validation error for short resolution notes');

        Boolean caughtHold = false;
        try {
            SmartCampusController.updateComplaintStatus(c.Id, 'On Hold', null, '');
        } catch (Exception e) {
            caughtHold = true;
        }
        System.assert(caughtHold, 'Should catch validation error for missing hold reason');
    }
}
