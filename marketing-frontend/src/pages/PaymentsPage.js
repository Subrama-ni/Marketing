// src/pages/PaymentsPage.js
import React, { useCallback, useEffect, useState } from "react";
import {
  getEntriesForPayment,
  getCustomerBalance,
  makePayment,
  getPaymentHistory,
  getCustomers,
} from "../api";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import "../App.css";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useBillingMode } from "../context/BillingModeContext";

const ONLY_SHOW_CUSTOMERS_WITH_ENTRIES = false;

export default function PaymentsPage({ selectedCustomer, onSelectCustomer }) {
  const { billingMode } = useBillingMode();

  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(selectedCustomer?.id || "");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [entriesData, setEntriesData] = useState({
    entries: [],
    carryForwardBalance: 0,
    totals: {
      totalAmount: 0,
      totalPaid: 0,
      totalRemaining: 0,
      remainingOutside: 0,
      totalOutstanding: 0,
    },
  });

  const [scheduledEntries, setScheduledEntries] = useState([]);
  const [payAmount, setPayAmount] = useState(0);
  const [mode, setMode] = useState("cash");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [blockedDates, setBlockedDates] = useState(new Set());

  // Saved balance is independent of date filters and entry loading.
  const [savedCustomerBalance, setSavedCustomerBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState("");

  // Commission
  const [commissionPercent, setCommissionPercent] = useState("");
  const [commissionAmount, setCommissionAmount] = useState(0);
  const [payableAfterCommission, setPayableAfterCommission] = useState(0);

  // Bags
  const [bagCount, setBagCount] = useState(0);
  const [bagAmountPer, setBagAmountPer] = useState(0);
  const [bagTotal, setBagTotal] = useState(0);

  // Existing entry payment details
  const [alreadyPaid, setAlreadyPaid] = useState(0);
  const [luggageTotal, setLuggageTotal] = useState(0);

  const [selectedUnpaidIds, setSelectedUnpaidIds] = useState(new Set());

  const carryForwardBalance = Number(
    savedCustomerBalance || entriesData.carryForwardBalance || 0,
  );

  const selectedRawOutstanding = entriesData.entries
    .filter((entry) => Number(entry.remaining) > 0 && selectedUnpaidIds.has(entry.id))
    .reduce((total, entry) => total + Number(entry.remaining || 0), 0);

  const selectedOutstanding = Math.max(0, Number((
    selectedRawOutstanding - Number(alreadyPaid || 0) - Number(commissionAmount || 0)
    + Number(billingMode === "luggage" ? luggageTotal || 0 : bagTotal || 0)
  ).toFixed(2)));

  const totalOutstanding = Number((carryForwardBalance + selectedOutstanding).toFixed(2));

  const computeFinalPayable = useCallback(
    (remaining, commission, bags, alreadyPaidVal, luggage) => {
      if (billingMode === "luggage") {
        return Math.max(
          Number(remaining) -
            Number(commission) -
            Number(alreadyPaidVal || 0) +
            Number(luggage || 0),
          0,
        );
      }

      return Math.max(
        Number(remaining) -
          Number(commission) +
          Number(bags) -
          Number(alreadyPaidVal),
        0,
      );
    },
    [billingMode],
  );

  const toISODate = useCallback((dateStr) => {
    if (!dateStr) return "";
    return dayjs(dateStr).isValid() ? dayjs(dateStr).format("YYYY-MM-DD") : "";
  }, []);

  const formatDateDDMMYYYY = useCallback((dateStr) => {
    if (!dateStr) return "";
    const date = dayjs(dateStr);
    return date.isValid() ? date.format("DD/MM/YYYY") : dateStr;
  }, []);

  /* --------------------- Load Customers --------------------- */

  const loadCustomers = useCallback(
    async (selectedBillingMode = billingMode) => {
      try {
        if (ONLY_SHOW_CUSTOMERS_WITH_ENTRIES) {
          const response = await getCustomers({
            billingType: selectedBillingMode,
          });
          setCustomers(response.data || []);
        } else {
          const response = await getCustomers();
          setCustomers(response.data || []);
        }
      } catch (error) {
        console.error("Error loading customers:", error);
        toast.error("Error loading customers");
      }
    },
    [billingMode],
  );

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  /* --------------------- Automatic Customer Balance --------------------- */

  useEffect(() => {
    let cancelled = false;

    const loadSavedBalance = async () => {
      if (!customerId) {
        setSavedCustomerBalance(0);
        setBalanceError("");
        setBalanceLoading(false);
        return;
      }

      setBalanceLoading(true);
      setBalanceError("");

      try {
        const response = await getCustomerBalance(customerId, billingMode);
        const data = response?.data ?? response;

        const balance = Number(
          data?.balance ??
            data?.currentBalance ??
            data?.carryForwardBalance ??
            0,
        );

        if (!cancelled) {
          setSavedCustomerBalance(Number.isFinite(balance) ? balance : 0);
        }
      } catch (error) {
        console.error("Error loading customer balance:", error);

        if (!cancelled) {
          setBalanceError(
            error?.response?.data?.message ||
              "Unable to load the saved customer balance.",
          );
        }
      } finally {
        if (!cancelled) {
          setBalanceLoading(false);
        }
      }
    };

    loadSavedBalance();

    return () => {
      cancelled = true;
    };
  }, [customerId, billingMode]);

  useEffect(() => {
    if (selectedCustomer) {
      setCustomerId(selectedCustomer.id);
      fetchHistory(selectedCustomer.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer]);

  /* --------------------- Fetch Entries --------------------- */

  const fetchEntries = async () => {
    if (!customerId) {
      return toast.warn("Select customer");
    }

    if (!fromDate || !toDate) {
      return toast.warn("Select date range");
    }

    if (dayjs(fromDate).isAfter(dayjs(toDate))) {
      return toast.warn("From date cannot be after To date");
    }

    try {
      setLoading(true);

      const response = await getEntriesForPayment(
        customerId,
        toISODate(fromDate),
        toISODate(toDate),
        billingMode,
      );

      const responseData = response.data || {};
      const data = responseData.entries || [];

      const carryForward = Number(
        responseData.carryForwardBalance ?? savedCustomerBalance ?? 0,
      );

      setSavedCustomerBalance(carryForward);

      const normalized = data.map((entry) => {
        const kgs = Number(entry.kgs || 0);
        const rate = Number(entry.rate || 0);
        const commission = Number(entry.commission || 0);
        const paid = Number(entry.paid_amount || 0);
        const luggageAmount = Number(entry.luggage_amount || 0);

        const amount = Number((kgs * rate).toFixed(2));
        const payableBeforePayment = Number((
          billingMode === "luggage" ? kgs * rate : Math.max(0, kgs - commission) * rate
        ).toFixed(2));

        // A transferred entry is settled into the carry-forward account and must
        // remain visible without being counted again. Otherwise show its payable
        // amount after the entry-level commission quantity deduction.
        const remaining = entry.balance_transferred_at
          ? 0
          : Math.max(Number((payableBeforePayment - paid).toFixed(2)), 0);
        // For a transferred historical row with no individual payment record,
        // display the payable after the currently entered percentage commission.
        // This is a display value only; it does not modify recorded payments.
        const displayCommissionPercent = Math.min(
          100,
          Math.max(0, Number(commissionPercent || 0)),
        );
        const displayedPaid = entry.balance_transferred_at && paid <= 0
          ? Number((payableBeforePayment * (1 - displayCommissionPercent / 100)).toFixed(2))
          : paid;

        return {
          ...entry,
          entry_date: dayjs(entry.entry_date).format("YYYY-MM-DD"),
          kgs,
          rate,
          commission,
          amount,
          paid_amount: displayedPaid,
          recorded_paid_amount: paid,
          remaining,
          bags: Number(entry.bags || 0),
          item_name: entry.item_name || "",
          already_paid: Number(entry.already_paid || 0),
          luggage_amount: luggageAmount,
        };
      });

      const blocked = new Set();

      normalized.forEach((entry) => {
        if (entry.remaining === 0) {
          blocked.add(entry.entry_date);
        }
      });

      const totalAmount = normalized.reduce(
        (sum, entry) => sum + entry.amount,
        0,
      );

      const totalPaid = normalized.reduce(
        (sum, entry) => sum + Math.min(entry.paid_amount, entry.amount),
        0,
      );

      const totalRemaining = normalized.reduce(
        (sum, entry) => sum + entry.remaining,
        0,
      );

      const unpaidEntries = normalized.filter((entry) => entry.remaining > 0);

      const defaultSelected = new Set(unpaidEntries.map((entry) => entry.id));

      const totalBagsUnpaid = unpaidEntries.reduce(
        (sum, entry) => sum + Number(entry.bags || 0),
        0,
      );

      const totalAlreadyPaidUnpaid = unpaidEntries.reduce(
        (sum, entry) => sum + Number(entry.already_paid || 0),
        0,
      );

      const totalLuggageUnpaid = unpaidEntries.reduce(
        (sum, entry) => sum + Number(entry.luggage_amount || 0),
        0,
      );

      setBlockedDates(blocked);

      setEntriesData({
        entries: normalized,
        carryForwardBalance: carryForward,
        totals: {
          totalAmount,
          totalPaid,
          totalRemaining,
          remainingOutside: Number(responseData.totals?.remainingOutside || 0),
          totalOutstanding: Number((carryForward + totalRemaining).toFixed(2)),
        },
      });

      setScheduledEntries(normalized);
      setSelectedUnpaidIds(defaultSelected);

      setBagCount(totalBagsUnpaid);
      setAlreadyPaid(totalAlreadyPaidUnpaid);
      setLuggageTotal(totalLuggageUnpaid);

      setCommissionAmount(0);
      setPayableAfterCommission(0);
      setBagTotal(0);

      const initialPayable = computeFinalPayable(
        totalRemaining,
        0,
        0,
        totalAlreadyPaidUnpaid,
        totalLuggageUnpaid,
      );

      setPayAmount(Number((carryForward + initialPayable).toFixed(2)));
    } catch (error) {
      console.error("Error fetching entries:", error);
      toast.error(error?.response?.data?.message || "Error fetching entries");
    } finally {
      setLoading(false);
    }
  };

  /* --------------------- Fetch Payment History --------------------- */

  const fetchHistory = async (customer) => {
    if (!customer) {
      setHistory([]);
      return;
    }

    try {
      const response = await getPaymentHistory(customer);
      setHistory(response.data || []);
    } catch (error) {
      console.error("Payment history error:", error);
    }
  };

  /* --------------------- Recalculate on Selection Changes --------------------- */

  useEffect(() => {
    const unpaidSelected = entriesData.entries.filter(
      (entry) => entry.remaining > 0 && selectedUnpaidIds.has(entry.id),
    );

    const autoBags = unpaidSelected.reduce(
      (sum, entry) => sum + Number(entry.bags || 0),
      0,
    );

    const autoAlready = unpaidSelected.reduce(
      (sum, entry) => sum + Number(entry.already_paid || 0),
      0,
    );

    const autoLuggage = unpaidSelected.reduce(
      (sum, entry) => sum + Number(entry.luggage_amount || 0),
      0,
    );

    const remainingSelected = unpaidSelected.reduce(
      (sum, entry) => sum + Number(entry.remaining || 0),
      0,
    );

    setBagCount(autoBags);
    setAlreadyPaid(autoAlready);
    setLuggageTotal(autoLuggage);

    const bagsTotal = autoBags * Number(bagAmountPer || 0);
    setBagTotal(Number(bagsTotal.toFixed(2)));

    const final = computeFinalPayable(
      remainingSelected,
      commissionAmount,
      bagsTotal,
      autoAlready,
      autoLuggage,
    );

    setPayAmount(Number((carryForwardBalance + final).toFixed(2)));
  }, [
    carryForwardBalance,
    selectedUnpaidIds,
    entriesData.entries,
    bagAmountPer,
    commissionAmount,
    billingMode,
    computeFinalPayable,
  ]);

  /* --------------------- Commission Calculation --------------------- */

  const handleCommissionLoad = () => {
    const unpaidSelected = entriesData.entries.filter(
      (entry) => entry.remaining > 0 && selectedUnpaidIds.has(entry.id),
    );

    const remainingSelected = unpaidSelected.reduce(
      (sum, entry) => sum + Number(entry.remaining || 0),
      0,
    );

    const percent = Number(commissionPercent || 0);

    if (percent < 0 || percent > 100) {
      return toast.error("Enter a valid commission percentage");
    }

    // Percentage commission applies to selected outstanding (Remaining),
    // not the gross Amount column.
    const commissionValue = Number(((remainingSelected * percent) / 100).toFixed(2));

    const payable = Math.max(remainingSelected - commissionValue, 0);

    setCommissionAmount(commissionValue);
    setPayableAfterCommission(payable);

    const autoBags = unpaidSelected.reduce(
      (sum, entry) => sum + Number(entry.bags || 0),
      0,
    );

    const autoAlready = unpaidSelected.reduce(
      (sum, entry) => sum + Number(entry.already_paid || 0),
      0,
    );

    const autoLuggage = unpaidSelected.reduce(
      (sum, entry) => sum + Number(entry.luggage_amount || 0),
      0,
    );

    const bagsTotal = autoBags * Number(bagAmountPer || 0);

    setBagCount(autoBags);
    setAlreadyPaid(autoAlready);
    setLuggageTotal(autoLuggage);
    setBagTotal(Number(bagsTotal.toFixed(2)));

    const final = computeFinalPayable(
      remainingSelected,
      commissionValue,
      bagsTotal,
      autoAlready,
      autoLuggage,
    );

    setPayAmount(Number((carryForwardBalance + final).toFixed(2)));
  };

  /* --------------------- Bag Calculation --------------------- */

  const handleBagLoad = () => {
    const bagsTotal = Number(
      (Number(bagCount) * Number(bagAmountPer || 0)).toFixed(2),
    );

    setBagTotal(bagsTotal);

    const unpaidSelected = entriesData.entries.filter(
      (entry) => entry.remaining > 0 && selectedUnpaidIds.has(entry.id),
    );

    const remainingSelected = unpaidSelected.reduce(
      (sum, entry) => sum + Number(entry.remaining || 0),
      0,
    );

    const autoAlready = unpaidSelected.reduce(
      (sum, entry) => sum + Number(entry.already_paid || 0),
      0,
    );

    const autoLuggage = unpaidSelected.reduce(
      (sum, entry) => sum + Number(entry.luggage_amount || 0),
      0,
    );

    const final = computeFinalPayable(
      remainingSelected,
      commissionAmount,
      bagsTotal,
      autoAlready,
      autoLuggage,
    );

    setPayAmount(Number((carryForwardBalance + final).toFixed(2)));
  };

  /* --------------------- Entry Selection --------------------- */

  const toggleUnpaidSelection = (id) => {
    setSelectedUnpaidIds((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const selectAllUnpaid = () => {
    const all = entriesData.entries
      .filter((entry) => entry.remaining > 0)
      .map((entry) => entry.id);

    setSelectedUnpaidIds(new Set(all));
  };

  const clearAllUnpaid = () => {
    setSelectedUnpaidIds(new Set());
  };

  /* --------------------- Process Payment --------------------- */

  const handlePay = async () => {
    if (!customerId) {
      return toast.warn("Select customer");
    }

    const hasDateRange = Boolean(fromDate && toDate);

    if (Boolean(fromDate) !== Boolean(toDate)) {
      return toast.warn("Choose both From and To dates, or clear both to pay only the carry-forward balance.");
    }

    if (!hasDateRange && carryForwardBalance <= 0) {
      return toast.warn(
        "Select a date range to load entries, or choose a customer with an outstanding balance.",
      );
    }

    if (hasDateRange && dayjs(fromDate).isAfter(dayjs(toDate))) {
      return toast.warn("From date cannot be after To date");
    }

    const paymentAmount = Number(payAmount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return toast.error("Enter a valid payment amount");
    }

    const unpaidSelected = entriesData.entries.filter(
      (entry) => Number(entry.remaining) > 0 && selectedUnpaidIds.has(entry.id),
    );

    const currentRawOutstanding = unpaidSelected.reduce(
      (total, entry) => total + Number(entry.remaining || 0),
      0,
    );
    const currentSelectedOutstanding = Math.max(0, Number((
      currentRawOutstanding - Number(alreadyPaid || 0) - Number(commissionAmount || 0)
      + Number(billingMode === "luggage" ? luggageTotal || 0 : bagTotal || 0)
    ).toFixed(2)));

    const previousBalance = Number(carryForwardBalance || 0);

    const maximumPayment = Number(
      (previousBalance + currentSelectedOutstanding).toFixed(2),
    );

    if (maximumPayment <= 0) {
      return toast.info("There is no outstanding balance to pay.");
    }

    if (paymentAmount > maximumPayment + 0.005) {
      return toast.error(
        `Payment cannot exceed the outstanding balance of ₹${maximumPayment.toFixed(2)}.`,
      );
    }

    try {
      setLoading(true);

      const payload = {
        customerId: Number(customerId),
        amount: paymentAmount,
        paymentMode: mode,
        fromDate: toISODate(fromDate) || null,
        toDate: toISODate(toDate) || null,
        billingType: billingMode,
        meta: {
          commissionPercent: Number(commissionPercent || 0),
          commissionAmount: Number(commissionAmount || 0),
          bagCount: Number(bagCount || 0),
          bagAmountPer: Number(bagAmountPer || 0),
          bagTotal: Number(bagTotal || 0),
          alreadyPaid: Number(alreadyPaid || 0),
          luggageTotal: Number(luggageTotal || 0),
          includedEntryIds: hasDateRange ? unpaidSelected.map((entry) => entry.id) : [],
        },
      };

      const paymentResponse = await makePayment(payload);
      const paymentResult = paymentResponse.data || {};

      toast.success("Payment successful!");

      generatePDF(null, false, paymentResult);

      await Promise.all([
        loadCustomers(billingMode),
        fetchHistory(customerId),
        getCustomerBalance(customerId, billingMode).then((balanceResponse) => {
          const balanceData = balanceResponse?.data ?? balanceResponse;

          const balance = Number(
            balanceData?.balance ??
              balanceData?.currentBalance ??
              balanceData?.carryForwardBalance ??
              0,
          );

          setSavedCustomerBalance(Number.isFinite(balance) ? balance : 0);
          setBalanceError("");
        }),
        ...(hasDateRange ? [fetchEntries()] : []),
      ]);
    } catch (error) {
      console.error("Payment error:", error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Error processing payment",
      );
    } finally {
      setLoading(false);
    }
  };

  /* --------------------- Generate PDF Receipt --------------------- */

  const generatePDF = (
    historyRecord = null,
    forPrint = false,
    paymentResult = null,
  ) => {
    const doc = new jsPDF();

    const customer = customers.find((item) => item.id === Number(customerId));

    const customerName = customer?.name || "";
    const customerPhone = customer?.phone || customer?.ph_number || "";

    doc.setFontSize(16);
    doc.text("Payment Receipt", 14, 20);

    doc.setFontSize(12);
    doc.text(`Customer: ${customerName}`, 14, 30);
    doc.text(`Phone: ${customerPhone}`, 14, 36);

    if (historyRecord) {
      doc.text(
        `Period: ${formatDateDDMMYYYY(historyRecord.from_date)} → ${formatDateDDMMYYYY(historyRecord.to_date)}`,
        14,
        42,
      );

      doc.text(`Mode: ${historyRecord.mode}`, 14, 48);

      doc.text(
        `Amount Paid: ₹${Number(historyRecord.amount || 0).toFixed(2)}`,
        14,
        56,
      );

      if (forPrint) {
        doc.autoPrint();
        window.open(doc.output("bloburl"));
        return;
      }

      doc.save(`Payment_${customerName}_${historyRecord.id}.pdf`);
      return;
    }

    doc.text(
      `Period: ${formatDateDDMMYYYY(fromDate)} → ${formatDateDDMMYYYY(toDate)}`,
      14,
      42,
    );

    doc.text(`Mode: ${mode}`, 14, 48);

    const rows = entriesData.entries.map((entry) => [
      formatDateDDMMYYYY(entry.entry_date),
      entry.item_name || "-",
      String(entry.kgs),
      `₹${Number(entry.rate || 0).toFixed(2)}`,
      billingMode === "luggage" ? "-" : String(entry.commission || 0),
      billingMode === "luggage"
        ? `₹${Number(entry.luggage_amount || 0).toFixed(2)}`
        : String(entry.bags || 0),
      `₹${Number(entry.amount || 0).toFixed(2)}`,
      `₹${Number(entry.paid_amount || 0).toFixed(2)}`,
      `₹${Number(entry.remaining || 0).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 55,
      head: [
        [
          "Date",
          "Item",
          "Kgs",
          "Rate",
          "Comm",
          "Bags/Luggage",
          "Amount",
          "Paid",
          "Remaining",
        ],
      ],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fontSize: 8 },
    });

    let y = (doc.lastAutoTable?.finalY || 55) + 10;

    const previousBalance = Number(
      paymentResult?.previousBalance ?? carryForwardBalance ?? 0,
    );

    const currentOutstanding = Number(
      paymentResult?.currentBillAmount ?? selectedOutstanding,
    );

    const totalBeforePayment = Number(
      paymentResult?.totalOutstanding ?? previousBalance + currentOutstanding,
    );

    const paymentReceived = Number(
      paymentResult?.paymentReceived ?? paymentResult?.amount ?? payAmount,
    );

    const closingBalance = Number(
      paymentResult?.closingBalance ??
        paymentResult?.outstandingAfterPayment ??
        Math.max(0, totalBeforePayment - paymentReceived),
    );

    doc.setFontSize(10);

    doc.text(
      `Previous Carry-Forward Balance: ₹${previousBalance.toFixed(2)}`,
      14,
      y,
    );
    y += 7;

    doc.text(
      `Selected Entries Outstanding: ₹${currentOutstanding.toFixed(2)}`,
      14,
      y,
    );
    y += 7;

    doc.text(
      `Total Outstanding Before Payment: ₹${totalBeforePayment.toFixed(2)}`,
      14,
      y,
    );
    y += 7;

    if (commissionAmount > 0) {
      doc.text(`Commission: -₹${Number(commissionAmount).toFixed(2)}`, 14, y);
      y += 7;
    }

    if (bagTotal > 0 && billingMode !== "luggage") {
      doc.text(`Bag Charges: +₹${Number(bagTotal).toFixed(2)}`, 14, y);
      y += 7;
    }

    if (luggageTotal > 0 && billingMode === "luggage") {
      doc.text(`Luggage Total: +₹${Number(luggageTotal).toFixed(2)}`, 14, y);
      y += 7;
    }

    y += 2;

    doc.setFontSize(12);
    doc.text(`Payment Received: ₹${paymentReceived.toFixed(2)}`, 14, y);
    y += 9;

    doc.setFontSize(14);
    doc.text(
      `Remaining Customer Balance: ₹${closingBalance.toFixed(2)}`,
      14,
      y,
    );

    if (forPrint) {
      doc.autoPrint();
      window.open(doc.output("bloburl"));
      return;
    }

    doc.save(`Payment_${customerName}_${Date.now()}.pdf`);
  };

  const isDateBlocked = (date) => blockedDates.has(date);

  /* --------------------- Page UI --------------------- */

  return (
    <div className="col">
      {/* Customer and date selection */}
      <div className="card">
        <h2>
          💰 Payments Page ({billingMode === "luggage" ? "Luggage" : "Farmer"})
        </h2>

        <div className="form-row">
          <label>Customer:</label>

          <select
            className="input"
            value={customerId}
            onChange={(event) => {
              const selectedId = event.target.value;
              const selected = customers.find(
                (item) => item.id === Number(selectedId),
              );

              setCustomerId(selectedId);
              onSelectCustomer?.(selected);

              setSavedCustomerBalance(0);
              setBalanceError("");

              setEntriesData({
                entries: [],
                carryForwardBalance: 0,
                totals: {
                  totalAmount: 0,
                  totalPaid: 0,
                  totalRemaining: 0,
                  remainingOutside: 0,
                  totalOutstanding: 0,
                },
              });

              setScheduledEntries([]);
              setSelectedUnpaidIds(new Set());
              setPayAmount(0);
              setCommissionPercent("");
              setCommissionAmount(0);
              setPayableAfterCommission(0);
              setBagCount(0);
              setBagAmountPer(0);
              setBagTotal(0);
              setAlreadyPaid(0);
              setLuggageTotal(0);

              if (selectedId) {
                fetchHistory(Number(selectedId));
              } else {
                setHistory([]);
              }
            }}
          >
            <option value="">-- select customer --</option>

            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} • #{customer.serial}
              </option>
            ))}
          </select>

          <label>From:</label>

          <input
            className="input"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />

          <label>To:</label>

          <input
            className="input"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />

          <button className="btn" onClick={fetchEntries} disabled={loading}>
            {loading ? "Loading..." : "Load Entries"}
          </button>
        </div>
      </div>

      {/* Entries table */}
      {scheduledEntries.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>📋 Entries in Scheduled Range</h3>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <button className="btn" onClick={selectAllUnpaid}>
              Select All Unpaid
            </button>

            <button className="btn ghost" onClick={clearAllUnpaid}>
              Clear Selection
            </button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Include</th>
                <th>Date</th>
                <th>Item</th>
                <th>Kgs</th>
                <th>Rate</th>

                {billingMode === "luggage" ? (
                  <th>Luggage</th>
                ) : (
                  <>
                    <th>Comm</th>
                    <th>Bags</th>
                  </>
                )}

                <th>Amount</th>
                <th>Paid</th>
                <th>Remaining</th>
              </tr>
            </thead>

            <tbody>
              {scheduledEntries.map((entry) => {
                const isUnpaid = entry.remaining > 0;

                return (
                  <tr key={entry.id}>
                    <td>
                      {isUnpaid ? (
                        <input
                          type="checkbox"
                          checked={selectedUnpaidIds.has(entry.id)}
                          onChange={() => toggleUnpaidSelection(entry.id)}
                        />
                      ) : (
                        <input type="checkbox" disabled />
                      )}
                    </td>

                    <td>{formatDateDDMMYYYY(entry.entry_date)}</td>
                    <td>{entry.item_name || "-"}</td>
                    <td>{entry.kgs}</td>
                    <td>{entry.rate}</td>

                    {billingMode === "luggage" ? (
                      <td>₹{Number(entry.luggage_amount || 0).toFixed(2)}</td>
                    ) : (
                      <>
                        <td>{entry.commission}</td>
                        <td>{entry.bags}</td>
                      </>
                    )}

                    <td>₹{entry.amount.toFixed(2)}</td>
                    <td>₹{entry.paid_amount.toFixed(2)}</td>
                    <td>₹{entry.remaining.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Commission */}
      {billingMode !== "luggage" && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>🏦 Commission</h3>

          <div style={{ display: "flex", gap: 12 }}>
            <input
              className="input"
              placeholder="Commission %"
              type="number"
              min="0"
              max="100"
              value={commissionPercent}
              onChange={(event) => setCommissionPercent(event.target.value)}
            />

            <button className="btn" onClick={handleCommissionLoad}>
              Apply
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            <div>
              Remaining: ₹
              {Number(entriesData.entries
                .filter((entry) => entry.remaining > 0 && selectedUnpaidIds.has(entry.id))
                .reduce((sum, entry) => sum + Number(entry.remaining || 0), 0)
              ).toFixed(2)}
            </div>

            <div>Commission Amount: ₹{Number(commissionAmount).toFixed(2)}</div>

            <div>
              Payable After Commission: ₹
              {Number(payableAfterCommission).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Bag charges */}
      {billingMode !== "luggage" && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>🧺 Bag Charges</h3>

          <div style={{ display: "flex", gap: 12 }}>
            <div>
              <label>Bags</label>
              <input
                className="input"
                type="number"
                min="0"
                value={bagCount}
                onChange={(event) => setBagCount(Number(event.target.value))}
              />
            </div>

            <div>
              <label>Amount per Bag</label>
              <input
                className="input"
                type="number"
                min="0"
                value={bagAmountPer}
                onChange={(event) =>
                  setBagAmountPer(Number(event.target.value))
                }
              />
            </div>

            <button className="btn" onClick={handleBagLoad}>
              Calculate
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            Bag Total: ₹{Number(bagTotal).toFixed(2)}
          </div>
        </div>
      )}

      {/* Already paid */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3>💵 Already Paid (from unpaid entries)</h3>

        <input
          className="input"
          type="number"
          value={alreadyPaid.toFixed(2)}
          disabled
          style={{ maxWidth: 220 }}
        />

        <div style={{ fontSize: 13, color: "#777" }}>
          Automatically extracted from selected unpaid entries.
        </div>

        {billingMode === "luggage" && (
          <div style={{ marginTop: 8 }}>
            Luggage Total: ₹{luggageTotal.toFixed(2)}
          </div>
        )}
      </div>

      {/* Customer balance — always immediately above Final Payment */}
      {customerId ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Customer Balance Summary</h3>

          {balanceLoading ? (
            <p>Loading saved customer balance...</p>
          ) : (
            <>
              <div>
                Previous Carry-Forward Balance: ₹
                {carryForwardBalance.toFixed(2)}
              </div>

              <div>
                Selected Entries Outstanding: ₹{selectedOutstanding.toFixed(2)}
              </div>

              <div style={{ marginTop: 8, fontWeight: 700 }}>
                Total Available to Pay: ₹{totalOutstanding.toFixed(2)}
              </div>

              {balanceError && (
                <p style={{ color: "#b42318" }}>{balanceError}</p>
              )}

              {(!fromDate || !toDate) && (
                <p>
                  The saved balance is shown without dates. Select a date range
                  and load entries to include new entries in the payment.
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Customer Balance Summary</h3>
          <p>Please select a customer to view their carry-forward balance.</p>
        </div>
      )}

      {/* Final payment */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Final Payment</h3>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <label>Payable</label>

          <input
            className="input"
            type="number"
            min="0.01"
            step="0.01"
            value={payAmount}
            onChange={(event) => setPayAmount(Number(event.target.value))}
            style={{ maxWidth: 200 }}
          />

          <select
            className="input"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="qr">QR</option>
            <option value="netbanking">Net Banking</option>
            <option value="cheque">Cheque</option>
          </select>

          <button
            className="btn"
            onClick={handlePay}
            disabled={loading || balanceLoading}
          >
            {loading
              ? "Processing..."
              : `Pay ₹${Number(payAmount || 0).toFixed(2)}`}
          </button>

          <button className="btn ghost" onClick={() => generatePDF()}>
            Preview Bill
          </button>
        </div>
      </div>

      {/* Payment history */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2>📜 Payment History</h2>

        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Mode</th>
              <th>Period</th>
              <th>Download</th>
              <th>Print</th>
            </tr>
          </thead>

          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>
                  No records
                </td>
              </tr>
            ) : (
              history.map((record) => (
                <tr key={record.id}>
                  <td>{formatDateDDMMYYYY(record.payment_date)}</td>

                  <td>₹{Number(record.amount || 0).toFixed(2)}</td>

                  <td>{record.mode}</td>

                  <td>
                    {formatDateDDMMYYYY(record.from_date)} →{" "}
                    {formatDateDDMMYYYY(record.to_date)}
                  </td>

                  <td>
                    <button
                      className="btn ghost"
                      onClick={() => generatePDF(record)}
                    >
                      Download
                    </button>
                  </td>

                  <td>
                    <button
                      className="btn ghost"
                      onClick={() => generatePDF(record, true)}
                    >
                      Print
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
