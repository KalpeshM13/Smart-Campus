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

        // 1. Create high priority complaint
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

        // 2. Dashboard Metrics
        SmartCampusController.DashboardMetrics metrics = SmartCampusController.getDashboardMetrics();
        System.assert(metrics.totalComplaints >= 1);
        System.assertNotEquals(null, metrics.departmentBreakdown);
        System.assertNotEquals(null, metrics.categoryBreakdown);

        // 3. Status Transitions
        Case inProg = SmartCampusController.updateComplaintStatus(createdCase.Id, 'In Progress', null, null);
        System.assertEquals('In Progress', inProg.Status);

        Case onHold = SmartCampusController.updateComplaintStatus(createdCase.Id, 'On Hold', null, 'Awaiting router replacement');
        System.assertEquals('On Hold', onHold.Status);

        Case resolved = SmartCampusController.updateComplaintStatus(createdCase.Id, 'Resolved', 'Replaced faulty Cisco AP transceiver on second floor.', null);
        System.assertEquals('Resolved', resolved.Status);

        // 4. CSAT Feedback & Auto-Close
        Complaint_Feedback__c fb = SmartCampusController.submitCSATFeedback(createdCase.Id, 5, 'Great and prompt response!');
        System.assertNotEquals(null, fb.Id);

        Case closedCase = [SELECT Id, Status FROM Case WHERE Id = :createdCase.Id];
        System.assertEquals('Closed', closedCase.Status);

        // 5. Reference Queries
        System.assert(SmartCampusController.getCategories().size() >= 1);
        System.assert(SmartCampusController.getDepartments().size() >= 1);
        System.assertNotEquals(null, SmartCampusController.getQueues());
        System.assert(SmartCampusController.getFeedbackList().size() >= 1);

        Test.stopTest();
    }

    @isTest
    static void testVariousFiltersAndReassignment() {
        Complaint_Category__c cat = [SELECT Id FROM Complaint_Category__c LIMIT 1];
        Department__c dept = [SELECT Id FROM Department__c LIMIT 1];

        // Create sample cases with different statuses
        Case c1 = new Case(Subject = 'Test Open Case', Status = 'New', Department__c = dept.Id, Complaint_Category__c = cat.Id);
        Case c2 = new Case(Subject = 'Test In Progress Case', Status = 'In Progress', Department__c = dept.Id);
        Case c3 = new Case(Subject = 'Test On Hold Case', Status = 'On Hold', Hold_Reason__c = 'Parts on order', Department__c = dept.Id);
        Case c4 = new Case(Subject = 'Test Resolved Case', Status = 'Resolved', Resolution_Notes__c = 'Fixed the issue with testing', Department__c = dept.Id);
        Case c5 = new Case(Subject = 'Test Closed Case', Status = 'Closed', Department__c = dept.Id);
        insert new List<Case>{ c1, c2, c3, c4, c5 };

        Test.startTest();

        // Test viewMode and status filters
        List<Case> myCases = SmartCampusController.getComplaints('my', null, 'ALL', null);
        System.assertNotEquals(null, myCases);

        List<Case> deptCases = SmartCampusController.getComplaints('department', dept.Id, 'ALL', null);
        System.assert(deptCases.size() >= 5);

        List<Case> inProgCases = SmartCampusController.getComplaints('all', null, 'IN_PROGRESS', null);
        System.assert(inProgCases.size() >= 1);

        List<Case> onHoldCases = SmartCampusController.getComplaints('all', null, 'ON_HOLD', null);
        System.assert(onHoldCases.size() >= 1);

        List<Case> resolvedCases = SmartCampusController.getComplaints('all', null, 'RESOLVED', null);
        System.assert(resolvedCases.size() >= 1);

        List<Case> closedCases = SmartCampusController.getComplaints('all', null, 'CLOSED', null);
        System.assert(closedCases.size() >= 1);

        List<Case> searchCases = SmartCampusController.getComplaints('all', null, 'ALL', 'Test Open');
        System.assert(searchCases.size() >= 1);

        // Reassign
        Case reassigned = SmartCampusController.reassignComplaint(c1.Id, UserInfo.getUserId());
        System.assertEquals(UserInfo.getUserId(), reassigned.OwnerId);

        Test.stopTest();
    }

    @isTest
    static void testDifferentPrioritiesAndSLA() {
        Complaint_Category__c cat = [SELECT Id FROM Complaint_Category__c LIMIT 1];

        Test.startTest();

        // Medium priority
        Case medCase = SmartCampusController.createComplaint(new Map<String, Object>{
            'subject' => 'Medium Priority Test',
            'categoryId' => cat.Id,
            'priority' => 'Medium'
        });
        System.assertNotEquals(null, medCase.SLA_Target_Time__c);

        // Low priority
        Case lowCase = SmartCampusController.createComplaint(new Map<String, Object>{
            'subject' => 'Low Priority Test',
            'categoryId' => cat.Id,
            'priority' => 'Low'
        });
        System.assertNotEquals(null, lowCase.SLA_Target_Time__c);

        // Without category
        Case noCatCase = SmartCampusController.createComplaint(new Map<String, Object>{
            'subject' => 'No Category Test'
        });
        System.assertEquals('New', noCatCase.Status);

        Test.stopTest();
    }

    @isTest
    static void testValidationErrorsAndTriggers() {
        Case c = new Case(Subject = 'Test Validation Case', Status = 'New');
        insert c;

        Test.startTest();

        // 1. Missing subject
        Boolean caughtSubject = false;
        try {
            SmartCampusController.createComplaint(new Map<String, Object>{'subject' => ''});
        } catch (Exception e) {
            caughtSubject = true;
        }
        System.assert(caughtSubject, 'Should catch empty subject error');

        // 2. Short resolution notes
        Boolean caughtResolved = false;
        try {
            SmartCampusController.updateComplaintStatus(c.Id, 'Resolved', 'short', null);
        } catch (Exception e) {
            caughtResolved = true;
        }
        System.assert(caughtResolved, 'Should catch short resolution notes error');

        // 3. Short hold reason
        Boolean caughtHold = false;
        try {
            SmartCampusController.updateComplaintStatus(c.Id, 'On Hold', null, '');
        } catch (Exception e) {
            caughtHold = true;
        }
        System.assert(caughtHold, 'Should catch missing hold reason error');

        // 4. Invalid feedback rating
        Boolean caughtRating = false;
        try {
            SmartCampusController.submitCSATFeedback(c.Id, 0, 'Bad rating');
        } catch (Exception e) {
            caughtRating = true;
        }
        System.assert(caughtRating, 'Should catch invalid rating error');

        // 5. Overdue trigger check
        c.Status = 'In Progress';
        c.SLA_Target_Time__c = System.now().addHours(-5);
        update c;
        Case updatedC = [SELECT Id, Is_Overdue__c FROM Case WHERE Id = :c.Id];
        System.assertEquals(true, updatedC.Is_Overdue__c);

        Test.stopTest();
    }
}
