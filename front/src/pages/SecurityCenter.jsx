import React, { useState } from 'react';
import { changePassword } from '@utils/api/userService';
import '@styles/pages/SecurityCenter.css';

export default function SecurityCenter() {
    const [pwdData, setPwdData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [pwdMsg, setPwdMsg] = useState('');
    const [pwdLoading, setPwdLoading] = useState(false);

    const handlePwdChange = async (e) => {
        e.preventDefault();
        if (!pwdData.oldPassword || !pwdData.newPassword || !pwdData.confirmPassword) {
            setPwdMsg('请填写完整信息');
            return;
        }
        if (pwdData.newPassword !== pwdData.confirmPassword) {
            setPwdMsg('两次新密码输入不一致');
            return;
        }
        if (pwdData.newPassword.length < 8 || pwdData.newPassword.length > 12) {
            setPwdMsg('新密码长度需在8-12位之间');
            return;
        }
        setPwdLoading(true);
        setPwdMsg('');
        try {
            const res = await changePassword({
                oldPassword: pwdData.oldPassword,
                newPassword: pwdData.newPassword
            });
            if (res.code === 200) {
                setPwdMsg('密码修改成功');
                setPwdData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setPwdMsg(res.message || '修改失败');
            }
        } catch (err) {
            setPwdMsg(err.message || '请求异常');
        } finally {
            setPwdLoading(false);
        }
    };

    return (
        <div className="security-center-page">
            <div className="security-container">
                <h2 className="security-title">安全中心</h2>
                <div className="security-card">
                    <h3>修改密码</h3>
                    <form className="security-form" onSubmit={handlePwdChange}>
                        <div className="form-group">
                            <label>旧密码</label>
                            <input
                                type="password"
                                value={pwdData.oldPassword}
                                onChange={e => setPwdData({ ...pwdData, oldPassword: e.target.value })}
                                placeholder="请输入旧密码"
                            />
                        </div>
                        <div className="form-group">
                            <label>新密码</label>
                            <input
                                type="password"
                                value={pwdData.newPassword}
                                onChange={e => setPwdData({ ...pwdData, newPassword: e.target.value })}
                                placeholder="8-12位，含字母和数字"
                            />
                        </div>
                        <div className="form-group">
                            <label>确认新密码</label>
                            <input
                                type="password"
                                value={pwdData.confirmPassword}
                                onChange={e => setPwdData({ ...pwdData, confirmPassword: e.target.value })}
                                placeholder="再次输入新密码"
                            />
                        </div>
                        <button type="submit" className="security-btn" disabled={pwdLoading}>
                            {pwdLoading ? '提交中...' : '确认修改'}
                        </button>
                        {pwdMsg && <div className={`form-msg ${pwdMsg.includes('成功') ? 'success' : 'error'}`}>{pwdMsg}</div>}
                    </form>
                </div>
            </div>
        </div>
    );
}
