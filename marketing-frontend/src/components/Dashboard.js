import React, { useState } from 'react';
import CustomerForm from './CustomerForm';
import CustomerList from './CustomerList';
import EntryForm from './EntryForm';
import EntryList from './EntryList';
import PaymentsPage from './PaymentsPage';

export default function Dashboard(){
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [reloadFlag, setReloadFlag] = useState(0);

  return (
    <div className="grid">
      <div className="left">
        <CustomerForm onCreated={()=>setReloadFlag(f=>f+1)} />
        <CustomerList onSelect={(c)=>setSelectedCustomer(c)} key={reloadFlag} />
      </div>

      <div className="col">
        {!selectedCustomer ? (
          <div className="card"><h2>Select a customer to manage entries & payments</h2></div>
        ) : (
          <>
            <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div>
                <h2>{selectedCustomer.name}</h2>
                <div className="small">Serial: #{selectedCustomer.serial} • Phone: {selectedCustomer.phone || '-'}</div>
              </div>
            </div>

            <EntryForm customerId={selectedCustomer.id} onAdded={()=>setReloadFlag(f=>f+1)} />
            <EntryList customerId={selectedCustomer.id} key={reloadFlag} />
            <PaymentsPage customer={selectedCustomer} />
          </>
        )}
      </div>
    </div>
  );
}
