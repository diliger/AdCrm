ALTER TABLE Expenses ADD OuterID NVARCHAR(250) NULL
GO
ALTER TABLE Wallets ADD SysName NVARCHAR(250) NULL
GO

INSERT INTO Wallets (Name, CreateDate, CreatorID, ChangeDate, ChangerID, Deleted, TypeID, CompanyID, Balance, OrderNumber, InitialBalance, SysName) 
VALUES (N'Кошелек 1С', GETDATE(), 1, GETDATE(), 1, 0, 102, 1, 0, 0, 0, '1c')
GO

INSERT INTO ExpenseTypes (Name, Deleted, OrderNumber, Price, ForBalance, DefaultWalletID, WalletEditable, ManagerFee, ForSalary, SysName) 
VALUES (N'Расход 1С', 0, 0, 1, 0, @@IDENTITY, 0, 0, 0, '1c')
GO