import React, { useMemo } from "react";
import "./AppointmentsTimeline.css";

const AppointmentsTimeline = ({
  appointments,
  selectedDate,
  selectedStaffId,
  selectedServiceId,
  onAppointmentClick,
  staff = [],
}) => {
  // Generate time slots (8:00 AM to 4:30 PM in 30-minute intervals)
  const timeSlots = useMemo(() => {
    const slots = [];
    // From 8:00 AM to 4:30 PM in 30-minute intervals
    for (let hour = 8; hour <= 16; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      if (hour < 16) {
        slots.push(`${hour.toString().padStart(2, "0")}:30`);
      }
    }
    // Add 4:30 PM
    slots.push("16:30");
    return slots;
  }, []);

  // Filter appointments for the selected date
  const filteredAppointments = useMemo(() => {
    if (!selectedDate) return [];
    let filtered = appointments.filter((apt) => apt.date === selectedDate);

    // Apply staff filter if selected
    if (selectedStaffId) {
      filtered = filtered.filter((apt) => apt.staffId === selectedStaffId);
    }

    // Apply service filter if selected
    if (selectedServiceId) {
      filtered = filtered.filter((apt) => apt.serviceId === selectedServiceId);
    }

    return filtered;
  }, [appointments, selectedDate, selectedStaffId, selectedServiceId]);

  // Get status color class
  const getStatusColor = (status) => {
    switch (status) {
      case "مؤكد":
        return "timeline-confirmed";
      case "في الانتظار":
        return "timeline-pending";
      case "مكتمل":
        return "timeline-completed";
      case "ملغي":
        return "timeline-cancelled";
      default:
        return "";
    }
  };

  // Parse time string to get hour and minute
  const parseTime = (timeStr) => {
    const [hour, minute] = timeStr.split(":").map(Number);
    return { hour, minute };
  };

  // Calculate position percentage for appointment within the timeline
  const getAppointmentPosition = (time) => {
    const { hour, minute } = parseTime(time);
    // Timeline starts at 8 AM (hour 8) and goes to 4:30 PM (hour 16:30)
    const startHour = 8;
    const totalHours = 8.5; // 8 AM to 4:30 PM = 8.5 hours
    const hoursSinceStart = hour - startHour + minute / 60;
    return (hoursSinceStart / totalHours) * 100;
  };

  // Calculate width percentage based on duration
  const getAppointmentWidth = (duration) => {
    const totalMinutes = 8.5 * 60; // 8 AM to 4:30 PM = 510 minutes
    return (duration / totalMinutes) * 100;
  };

  // Group appointments by time for better visualization
  const groupedAppointments = useMemo(() => {
    const grouped = {};
    filteredAppointments.forEach((apt) => {
      if (!grouped[apt.time]) {
        grouped[apt.time] = [];
      }
      grouped[apt.time].push(apt);
    });
    return grouped;
  }, [filteredAppointments]);

  if (!selectedDate) {
    return (
      <div className="appointments-timeline">
        <div className="timeline-empty">
          <i className="fas fa-calendar-day"></i>
          <p>اختر تاريخاً لعرض جدول المواعيد</p>
        </div>
      </div>
    );
  }

  if (filteredAppointments.length === 0) {
    return (
      <div className="appointments-timeline">
        <div className="timeline-empty">
          <i className="fas fa-calendar-times"></i>
          <p>لا توجد مواعيد في {selectedDate}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="appointments-timeline">
      <div className="timeline-header">
        <div className="timeline-date">
          <i className="fas fa-calendar-day"></i>
          <h3>
            جدول المواعيد - {selectedDate}
            {selectedStaffId && (
              <span style={{ color: "var(--gold)", marginRight: "0.5rem" }}>
                (
                {staff.find((s) => s.id === selectedStaffId)?.name ||
                  "الأخصائية"}
                )
              </span>
            )}
          </h3>
        </div>
        <div className="timeline-count">
          <span>{filteredAppointments.length} مواعيد</span>
        </div>
      </div>

      <div className="timeline-container">
        {/* Time axis */}
        <div className="timeline-axis">
          {timeSlots.map((slot) => {
            const position = getAppointmentPosition(slot);
            return (
              <div
                key={slot}
                className="timeline-time-slot"
                style={{ right: `${position}%` }}
              >
                <span className="time-label">{slot}</span>
                <div className="time-marker"></div>
              </div>
            );
          })}
        </div>

        {/* Appointments track */}
        <div
          className="timeline-track"
          style={{
            minHeight: `${Math.max(
              150,
              filteredAppointments.length > 0
                ? (() => {
                    // Calculate number of rows needed
                    const rows = [];
                    const sortedAppointments = [...filteredAppointments].sort(
                      (a, b) => {
                        return (
                          getAppointmentPosition(a.time) -
                          getAppointmentPosition(b.time)
                        );
                      },
                    );

                    sortedAppointments.forEach((appointment) => {
                      const startPosition = getAppointmentPosition(
                        appointment.time,
                      );
                      const duration =
                        appointment.serviceDuration ||
                        appointment.duration ||
                        30;
                      const width = getAppointmentWidth(duration);
                      const endPosition = startPosition + width;

                      let placedInRow = false;
                      for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        const hasOverlap = row.some((apt) => {
                          const aptStart = getAppointmentPosition(apt.time);
                          const aptDuration =
                            apt.serviceDuration || apt.duration || 30;
                          const aptEnd =
                            aptStart + getAppointmentWidth(aptDuration);

                          // Add small tolerance (0.1%) to handle floating point precision
                          const tolerance = 0.1;

                          return (
                            startPosition + tolerance < aptEnd &&
                            endPosition - tolerance > aptStart
                          );
                        });

                        if (!hasOverlap) {
                          row.push(appointment);
                          placedInRow = true;
                          break;
                        }
                      }

                      if (!placedInRow) {
                        rows.push([appointment]);
                      }
                    });

                    return rows.length * 85 + 20; // 85px per row (68px card + 17px gap) + 20px padding
                  })()
                : 150,
            )}px`,
          }}
        >
          {(() => {
            // Algorithm to distribute appointments into rows without overlap
            const rows = [];
            const sortedAppointments = [...filteredAppointments].sort(
              (a, b) => {
                return (
                  getAppointmentPosition(a.time) -
                  getAppointmentPosition(b.time)
                );
              },
            );

            sortedAppointments.forEach((appointment) => {
              const startPosition = getAppointmentPosition(appointment.time);
              const duration =
                appointment.serviceDuration || appointment.duration || 30;
              const width = getAppointmentWidth(duration);
              const endPosition = startPosition + width;

              // Find a row where this appointment fits (no overlap)
              let placedInRow = false;
              for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const hasOverlap = row.some((apt) => {
                  const aptStart = getAppointmentPosition(apt.time);
                  const aptDuration = apt.serviceDuration || apt.duration || 30;
                  const aptEnd = aptStart + getAppointmentWidth(aptDuration);

                  // Add small tolerance (0.1%) to handle floating point precision
                  // Appointments that are touching (one ends when other starts) should NOT overlap
                  const tolerance = 0.1;

                  // Check if appointments overlap with tolerance
                  // Only overlap if there's actual time conflict (not just touching)
                  return (
                    startPosition + tolerance < aptEnd &&
                    endPosition - tolerance > aptStart
                  );
                });

                if (!hasOverlap) {
                  row.push(appointment);
                  placedInRow = true;
                  break;
                }
              }

              // If no suitable row found, create a new row
              if (!placedInRow) {
                rows.push([appointment]);
              }
            });

            // Render appointments with row index
            return rows.flatMap((row, rowIndex) =>
              row.map((appointment) => {
                const startPosition = getAppointmentPosition(appointment.time);
                const duration =
                  appointment.serviceDuration || appointment.duration || 30;
                const width = getAppointmentWidth(duration);

                return (
                  <div
                    key={appointment.id}
                    className={`timeline-appointment ${getStatusColor(
                      appointment.status,
                    )}`}
                    onClick={() =>
                      onAppointmentClick && onAppointmentClick(appointment)
                    }
                    style={{
                      right: `${startPosition}%`,
                      width: `${width}%`,
                      top: `${rowIndex * 85}px`,
                    }}
                    title={`${appointment.time} - ${appointment.customerName} - ${appointment.serviceName} (${duration} دقيقة)`}
                  >
                    <div className="appointment-compact">
                      <div className="appointment-time-compact">
                        {appointment.time}
                      </div>
                      <div className="appointment-name-compact">
                        {appointment.customerName} - {appointment.serviceName}
                      </div>
                      <div
                        className={`appointment-status-compact ${getStatusColor(
                          appointment.status,
                        )}`}
                      >
                        {appointment.status}
                      </div>
                    </div>
                  </div>
                );
              }),
            );
          })()}
        </div>
      </div>

      {/* Legend */}
      <div className="timeline-legend">
        <div className="legend-item">
          <span className="legend-color timeline-pending"></span>
          <span>في الانتظار</span>
        </div>
        <div className="legend-item">
          <span className="legend-color timeline-confirmed"></span>
          <span>مؤكد</span>
        </div>
        <div className="legend-item">
          <span className="legend-color timeline-completed"></span>
          <span>مكتمل</span>
        </div>
        <div className="legend-item">
          <span className="legend-color timeline-cancelled"></span>
          <span>ملغي</span>
        </div>
      </div>
    </div>
  );
};

export default AppointmentsTimeline;
