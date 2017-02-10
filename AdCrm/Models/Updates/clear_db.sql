DELETE FROM ProjectNotes
DELETE FROM Projects
DELETE FROM Transfers
DELETE FROM Expenses
UPDATE Employees SET UserID = NULL
UPDATE Users SET EmployeeID = NULL
DELETE FROM EmployeeWallets
DELETE FROM WalletRatios
DELETE FROM ExpenseTypes
UPDATE Wallets SET EmployeeID = NULL
DELETE FROM Wallets
DELETE FROM Employees
DELETE FROM Positions
DELETE FROM Departments
DELETE FROM Contractors
DELETE FROM Files
DELETE FROM ContactPersons
UPDATE Users SET ChangerID = 1, CreatorID = 1
DELETE FROM Users WHERE Login <> N'admin'
DELETE FROM Payments
SELECT * FROM Users

