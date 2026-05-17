import ScheduleRequest from "../models/scheduleRequest.js";

const normalizeHod = (value) => String(value || "").trim().toUpperCase();

const parseFreePeriods = (value) => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
};

const upsertApprovalResponse = async (request, freePeriods) => {
  const approvedAt = request.approvedAt || new Date();

  // Keep one response record addressed back to the original requester. This is
  // what lets the requesting HOD fetch the approved periods on their dashboard.
  return ScheduleRequest.findOneAndUpdate(
    {
      sourceRequestId: request._id,
    },
    {
      sourceRequestId: request._id,
      fromHod: request.toHod,
      toHod: request.fromHod,
      year: request.year,
      reason: "Free periods shared",
      status: "APPROVED",
      approvedTimetable: request.approvedTimetable || null,
      approvedAt,
      freePeriods,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

export const sendRequest = async (req, res) => {
  try {
    const { fromHod, toHod, year, reason } = req.body;
    const normalizedFromHod = normalizeHod(fromHod);
    const normalizedToHod = normalizeHod(toHod);

    if (!normalizedFromHod || !normalizedToHod || !year || !reason?.trim()) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const data = new ScheduleRequest({
      fromHod: normalizedFromHod,
      toHod: normalizedToHod,
      year,
      reason,
      status: "PENDING",
    });

    await data.save();

    res.json({ message: "Request Saved Successfully", data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error saving request" });
  }
};

export const getRequestsForHod = async (req, res) => {
  try {
    const toHod = normalizeHod(req.params.toHod);

    if (!toHod) {
      return res.status(400).json({ message: "Missing HOD department" });
    }

    const requests = await ScheduleRequest.find({
      toHod,
      status: { $in: ["PENDING", "APPROVED"] },
    }).sort({ updatedAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching requests" });
  }
};

export const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ScheduleRequest.findById(id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const freePeriods = parseFreePeriods(req.body.freePeriods);

    request.status = "APPROVED";
    request.approvedAt = new Date();
    request.freePeriods = freePeriods;

    await request.save();

    const responseRequest = await upsertApprovalResponse(request, freePeriods);

    res.status(200).json({
      success: true,
      message: "Free periods shared successfully",
      data: responseRequest,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await ScheduleRequest.findByIdAndUpdate(
      id,
      { status: "REJECTED" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.json({
      message: "Rejected successfully",
      data: updated,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error rejecting request" });
  }
};

export const viewApprovedTimetable = async (req, res) => {
  try {
    const requestId = req.params.id;

    const request = await ScheduleRequest.findById(requestId).populate(
      "approvedTimetable"
    );

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "APPROVED") {
      return res.status(400).json({ message: "Request not approved yet" });
    }

    return res.json({
      message: "Approved timetable fetched successfully",
      data: request,
      timetable: request.approvedTimetable,
      freePeriods: request.freePeriods || {},
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

export const submitFreePeriods = async (req, res) => {
  try {
    const { id } = req.params;
    const freePeriods = parseFreePeriods(req.body.freePeriods);

    const updatedRequest = await ScheduleRequest.findByIdAndUpdate(
      id,
      {
        freePeriods,
        status: "APPROVED",
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    const responseRequest = await upsertApprovalResponse(
      updatedRequest,
      freePeriods
    );

    res.status(200).json({
      success: true,
      message: "Free periods submitted successfully",
      data: responseRequest,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
