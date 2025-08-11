export default function HomePage() {
  const stats = [
    { title: "Today's Sales", value: "₹12,350", className: "card green" },
    { title: "Total Bills", value: "48", className: "card" },
    { title: "Pending Orders", value: "5", className: "card yellow" },
    { title: "Expenses", value: "₹2,450", className: "card red" },
  ];

  const recentBills = [
    { id: "BILL-001", table: "T1", amount: "₹450", status: "Paid" },
    { id: "BILL-002", table: "T3", amount: "₹720", status: "Pending" },
    { id: "BILL-003", table: "T2", amount: "₹1,200", status: "Paid" },
  ];

  return (
    <>
      <header className="header">
        <h2>Welcome Back 👋</h2>
        <button className="button">+ Create New Bill</button>
      </header>

      <div className="cards">
        {stats.map((stat) => (
          <div key={stat.title} className={stat.className}>
            <h3>{stat.title}</h3>
            <p>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Bill No.</th>
              <th>Table</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentBills.map((bill) => (
              <tr key={bill.id}>
                <td>{bill.id}</td>
                <td>{bill.table}</td>
                <td>{bill.amount}</td>
                <td>
                  <span
                    className={`status ${bill.status.toLowerCase()}`}
                  >
                    {bill.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
