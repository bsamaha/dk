# Human Action Items – CI/CD with AWS ECR

> Tasks the repository owner must perform outside of code changes/PRs.

1. **Create/Locate IAM User for GitHub Actions**
   * Attach `AmazonEC2ContainerRegistryFullAccess`.
   * Generate Access Key & Secret → add to repo secrets `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.

2. **Add Remaining GitHub Secrets**
   | Secret | Value |
   |--------|-------|
   | `AWS_REGION` | `us-east-2` |
   | `ECR_REGISTRY` | `311352839382.dkr.ecr.us-east-2.amazonaws.com` |
   | `ECR_REPOSITORY` | `bestball` |
   | `EC2_HOST` | Public IP / DNS of instance |
   | `EC2_SSH_KEY` | Private key for `ec2-user` |

3. **Authorize EC2 Instance to Pull from Private ECR (Recommended: IAM Role)**
   This is the most secure way to grant permissions to your EC2 instance without embedding credentials.

   **Steps:**
   a. **Create an IAM Role:**
      * Go to AWS Console -> **IAM** -> **Roles** -> **Create role**.
      * Select `AWS service` as trusted entity, then `EC2` for the use case.
      * Click **Next**.
      * Search for and attach the `AmazonEC2ContainerRegistryReadOnly` managed policy.
      * Click **Next**.
      * Give the role a descriptive name (e.g., `EC2-ECR-Pull-Role`) and click **Create role**.

   b. **Attach Role to EC2 Instance:**
      * Go to AWS Console -> **EC2** -> **Instances**.
      * Select your running EC2 instance.
      * Go to **Actions** -> `Security` -> `Modify IAM role`.
      * Select the `EC2-ECR-Pull-Role` (or whatever you named it) from the dropdown.
      * Click **Update IAM role**.

   c. **(Optional) Verify on EC2:**
      * SSH into your EC2 instance.
      * Run `aws sts get-caller-identity` to confirm the role is attached.
      * Your `deploy.sh` script will now be able to pull ECR images without explicit login commands.

4. **Upload `deploy.sh` to Instance**

   ```bash
   scp scripts/deploy.sh ec2-user@$EC2_HOST:~/app/scripts/
   ssh ec2-user@$EC2_HOST 'chmod +x ~/app/scripts/deploy.sh'
   ```

5. **Open Port 22 for GitHub Actions**

   * **Purpose**: To allow the GitHub Actions runner to SSH into your EC2 instance for deployment.
   * **Action**:
     * In the EC2 instance's Security Group, add an inbound rule.
     * **Type**: `SSH`
     * **Protocol**: `TCP`
     * **Port Range**: `22`
     * **Source**: `Anywhere (0.0.0.0/0)`
   * **Note**: While `Anywhere` is used, access is still secured by the SSH private key.

6. **Open Port 80 in Security Group** (if not already) – CloudFront expects it.

7. **First Manual Deploy**
   * On GitHub → Actions → *Manual Deploy* → choose branch `main` SHA.
   * Verify via `docker ps` and hitting `/health`.

8. **Set Up Pre-commit Locally** (`pip install pre-commit && pre-commit install`).

---
*Once these steps are complete the automated pipeline should run end-to-end.*
