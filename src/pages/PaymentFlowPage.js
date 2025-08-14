/**
 * 付款流程頁面
 * 
 * 獨立的付款流程頁面
 */

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PaymentFlow from '../components/Payment/PaymentFlow';

const PaymentFlowPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const planType = searchParams.get('plan') || 'pro';
    const billingPeriod = searchParams.get('period') || 'monthly';

    const handleSuccess = (subscription) => {
        navigate('/payment/status', {
            state: { 
                success: true,
                subscription 
            }
        });
    };

    const handleError = (error) => {
        navigate('/payment/status', {
            state: { 
                error: true,
                errorMessage: error.message 
            }
        });
    };

    const handleCancel = () => {
        navigate('/subscription');
    };

    return (
        <PaymentFlow
            planType={planType}
            billingPeriod={billingPeriod}
            onSuccess={handleSuccess}
            onError={handleError}
            onCancel={handleCancel}
        />
    );
};

export default PaymentFlowPage;