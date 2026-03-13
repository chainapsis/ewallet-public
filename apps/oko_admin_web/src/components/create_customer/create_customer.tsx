import styles from "./create_customer.module.scss";
import { CreateCustomerForm } from "@oko-wallet-admin/components/create_customer/create_customer_form";
import { CreateCustomerHeader } from "@oko-wallet-admin/components/create_customer/create_customer_header/create_customer_header";

export const CreateCustomer = () => {
  return (
    <div className={styles.wrapper}>
      <CreateCustomerHeader />
      <CreateCustomerForm />
    </div>
  );
};
