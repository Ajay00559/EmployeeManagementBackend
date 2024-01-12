const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const moment = require("moment");

const app = express();
const port = 8000;
const cors = require("cors");
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose
  .connect(
    "mongodb+srv://ajay:ajay@cluster0.h1sn0uc.mongodb.net/EmployeeManagement",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
  });

app.listen(port, () => {
  console.log(port, `server is running in port ${port}`);
});

const Employee = require("./models/employee");
const Attendance = require("./models/attendanceSchema");

// endpoint for registring an employee

app.post("/addEmployee", async (req, res) => {
  try {
    const {
      employeeName,
      employeeId,
      dateOfBirth,
      joiningDate,
      designation,
      phoneNumber,
      isActive,
      salary,
      address,
    } = req.body;

    console.log( "dhd-----------",
      employeeName,
      employeeId,
      dateOfBirth,
      joiningDate,
      designation,
      phoneNumber,
      isActive,
      salary,
      address,
    )

    const newEmployee = new Employee({
      employeeName,
      employeeId,
      dateOfBirth,
      joiningDate,
      designation,
      phoneNumber,
      isActive,
      salary,
      address,
    });

    await newEmployee.save();
    res.status(201).json({
      messae: "New Employee Saved Successfully",
      employee: newEmployee,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json("failed to add an employee");
  }
});

app.get("/employees", async (req, res) => {
  try {
    const employees = await Employee.find();
    console.log("Employees-------------",employees)
    res.status(200).json(employees);
  } catch (error) {
    console.log(error);
    res.status(500).json("failed to retrieve employees");
  }
});

app.post("/attendance", async (req, res) => {
  try {
    const { employeeName, employeeId, date, status } = req.body;

    const existingAttendance = await Attendance.findOne({ employeeId, date });

    if (existingAttendance) {
      existingAttendance.status = status;
      await existingAttendance.save();
      res.status(200).json(existingAttendance);
    } else {
      const newAttendance = new Attendance({
        employeeId,
        employeeName,
        date,
        status,
      });
      await newAttendance.save();
      res.status(200).json(newAttendance);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json("failed to submit Attendance");
  }
});

app.get("/getAttendance", async (req, res) => {
  try {
    const { date } = req.query;

    const attendanceData = await Attendance.find({ date });

    res.status(200).json(attendanceData);
  } catch (error) {
    console.log(error);
    res.status(500).json("Error fetching Attendance");
  }
});

app.get("/attendanceReportAllEmployees", async (req, res) => {
  try {
    const { month, year } = req.query;
    console.log(month, year);

    const startDate = moment(`${year}-${month}-01`, "YYYY-MM-DD")
      .startOf("month")
      .toDate();

    const endDate = moment(startDate).endOf("month").toDate();

    const report = await Attendance.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              {
                $eq: [
                  { $month: { $dateFromString: { dateString: "$date" } } },
                  parseInt(req.query.month),
                ],
              },
              {
                $eq: [
                  { $year: { $dateFromString: { dateString: "$date" } } },
                  parseInt(req.query.year),
                ],
              },
            ],
          },
        },
      },

      {
        $group: {
          _id: "$employeeId",
          present: {
            $sum: {
              $cond: { if: { $eq: ["$status", "present"] }, then: 1, else: 0 },
            },
          },
          absent: {
            $sum: {
              $cond: { if: { $eq: ["$status", "absent"] }, then: 1, else: 0 },
            },
          },
          halfday: {
            $sum: {
              $cond: { if: { $eq: ["$status", "halfday"] }, then: 1, else: 0 },
            },
          },
          holiday: {
            $sum: {
              $cond: { if: { $eq: ["$status", "holiday"] }, then: 1, else: 0 },
            },
          },
          leave: {
            $sum: {
              $cond: { if: { $eq: ["$status", "leave"] }, then: 1, else: 0 },
            },
          },
          wfh: {
            $sum: {
              $cond: { if: { $eq: ["$status", "wfh"] }, then: 1, else: 0 },
            },
          },
        },
      },
      {
        $lookup: {
          from: "employees", // Name of the employee collection
          localField: "_id",
          foreignField: "employeeId",
          as: "employeeDetails",
        },
      },
      {
        $unwind: "$employeeDetails", // Unwind the employeeDetails array
      },
      {
        $project: {
          _id: 1,
          present: 1,
          absent: 1,
          halfday: 1,
          wfh: 1,
          leave: 1,
          name: "$employeeDetails.employeeName",
          designation: "$employeeDetails.designation",
          salary: "$employeeDetails.salary",
          employeeId: "$employeeDetails.employeeId",
        },
      },
    ]);

    console.log("Report---------------", report);

    res.status(200).json(report);
  } catch (error) {
    console.log(error);
    res.status(500).json("Error fetching Attendance Report For All Employees");
  }
});


app.delete("/deleteEmployee/:employeeId", async (req, res) => {
  try {
    const employeeId = req.params.employeeId;

    // Assuming you are using Mongoose and have a model named Employee
    const deletedEmployee = await Employee.findOneAndDelete({ employeeId });

    if (deletedEmployee) {
      res.status(200).json({
        message: "Employee deleted successfully",
        employee: deletedEmployee,
      });
    } else {
      res.status(404).json({
        message: "Employee not found",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json("Failed to delete employee");
  }
});
